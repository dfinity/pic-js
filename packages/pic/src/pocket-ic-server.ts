import { ChildProcess, spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { chmodSync } from 'node:fs';
import {
  BinNotFoundError,
  BinStartError,
  BinStartMacOSArmError,
  BinTimeoutError,
} from './error';
import {
  exists,
  readFileAsString,
  tmpFile,
  isArm,
  isDarwin,
  poll,
} from './util';
import { StartServerOptions } from './pocket-ic-server-types';
import { Writable, Transform } from 'node:stream';

// Cache canister colors to avoid re-hashing on every print
const __PIC_COLOR_CACHE__: Map<string, [number, number, number]> = new Map();

/**
 * This class represents the main PocketIC server.
 * It is responsible for maintaining the lifecycle of the server process.
 * See {@link PocketIc} for details on the client to use with this server.
 *
 * @category API
 *
 * @example
 * ```ts
 * import { PocketIc, PocketIcServer } from '@dfinity/pic';
 * import { _SERVICE, idlFactory } from '../declarations';
 *
 * const wasmPath = resolve('..', '..', 'canister.wasm');
 *
 * const picServer = await PocketIcServer.start();
 * const pic = await PocketIc.create(picServer.getUrl());
 *
 * const fixture = await pic.setupCanister<_SERVICE>({ idlFactory, wasmPath });
 * const { actor } = fixture;
 *
 * // perform tests...
 *
 * await pic.tearDown();
 * await picServer.stop();
 * ```
 */
export class PocketIcServer {
  private readonly url: string;

  private constructor(
    private readonly serverProcess: ChildProcess,
    portNumber: number,
  ) {
    this.url = `http://127.0.0.1:${portNumber}`;
  }

  /**
   * Start a new PocketIC server.
   *
   * @param options Options for starting the server.
   * @returns An instance of the PocketIC server.
   */
  public static async start(
    options: StartServerOptions = {},
  ): Promise<PocketIcServer> {
    const binPath = this.getBinPath();
    await this.assertBinExists(binPath);

    const pid = process.ppid;
    const picFilePrefix = `pocket_ic_${pid}`;
    const portFilePath = tmpFile(`${picFilePrefix}.port`);

    const serverProcess = spawn(binPath, ['--port-file', portFilePath]);

    if (options.showRuntimeLogs) {
      serverProcess.stdout
        .pipe(new LineBufferTransform())
        .pipe(new LineFormatterTransform())
        .pipe(process.stdout);
    } else {
      // When runtime logs are hidden but canister logs are shown, surface only backtrace blocks
      if (options.showCanisterLogs) {
        serverProcess.stdout
          .pipe(new LineBufferTransform())
          .pipe(new BacktraceOnlyTransform())
          .pipe(process.stderr);
      } else {
        serverProcess.stdout.pipe(new NullStream());
      }
    }

    if (options.showCanisterLogs) {
      serverProcess.stderr
        .pipe(new LineBufferTransform())
        .pipe(new LineFormatterTransform())
        .pipe(process.stderr);
    } else {
      serverProcess.stderr.pipe(new NullStream());
    }

    serverProcess.on('error', error => {
      if (isArm() && isDarwin()) {
        throw new BinStartMacOSArmError(error);
      }

      throw new BinStartError(error);
    });

    return await poll(
      async () => {
        const portString = await readFileAsString(portFilePath);
        const port = parseInt(portString);
        if (isNaN(port)) {
          throw new BinTimeoutError();
        }

        return new PocketIcServer(serverProcess, port);
      },
      { intervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
    );
  }

  /**
   * Get the URL of the server.
   *
   * @returns The URL of the server.
   */
  public getUrl(): string {
    return this.url;
  }

  /**
   * Stop the server.
   *
   * @returns A promise that resolves when the server has stopped.
   */
  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.serverProcess.on('exit', () => {
        resolve();
      });

      this.serverProcess.on('error', error => {
        reject(error);
      });

      this.serverProcess.kill();
    });
  }

  private static getBinPath(): string {
    return resolve(__dirname, '..', 'pocket-ic');
  }

  private static async assertBinExists(binPath: string): Promise<void> {
    const binExists = await exists(binPath);

    if (!binExists) {
      throw new BinNotFoundError(binPath);
    }

    chmodSync(binPath, 0o700);
  }
}

const POLL_INTERVAL_MS = 20;
const POLL_TIMEOUT_MS = 30_000;

class NullStream extends Writable {
  _write(
    _chunk: any,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    callback();
  }
}

class LineBufferTransform extends Transform {
  private buffer: Buffer = Buffer.alloc(0);

  _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    try {
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any);
      let start = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i] === 0x0a) {
          // newline found; emit buffered + current slice (inclusive)
          const slice = data.slice(start, i + 1);
          if (this.buffer.length > 0) {
            this.push(Buffer.concat([this.buffer, slice]));
            this.buffer = Buffer.alloc(0);
          } else {
            this.push(slice);
          }
          start = i + 1;
        }
      }
      const remainder = data.slice(start);
      if (remainder.length > 0) {
        this.buffer = Buffer.concat([this.buffer, remainder]);
      }
      callback();
    } catch (err) {
      callback(err as Error);
    }
  }

  _flush(callback: (error?: Error | null) => void): void {
    try {
      if (this.buffer.length > 0) {
        // ensure trailing newline for the last partial line
        if (this.buffer[this.buffer.length - 1] !== 0x0a) {
          this.push(Buffer.concat([this.buffer, Buffer.from([0x0a])]))
        } else {
          this.push(this.buffer);
        }
        this.buffer = Buffer.alloc(0);
      }
      callback();
    } catch (err) {
      callback(err as Error);
    }
  }
}

class LineFormatterTransform extends Transform {
  private backtraceOpen: Map<string, boolean> = new Map();
  private globalBacktraceOpen: boolean = false;
  private lastTsMs: number | undefined;

  _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    try {
      const line = chunk.toString('utf8');
      const parsed = parseTimestampedLine(line);

      if (parsed) {
        const { tsMs, message } = parsed;
        let deltaMs: number | undefined;
        if (this.lastTsMs !== undefined) {
          const d = tsMs - this.lastTsMs;
          if (d >= 1000) deltaMs = d;
        }
        this.lastTsMs = tsMs;
        // Detect canister and rest
        const m = /^\[Canister\s+([^\]]+)\]\s*(.*)$/u.exec(message);
        if (m) {
          const full = m[1];
          const rest = m[2];
          const short = full.split('-').slice(0, 2).join('-');
          let inBt = this.backtraceOpen.get(short) ?? false;
          const grayBar = "\u001b[38;2;107;114;128m|\u001b[0m ";
          let formattedRest = rest;
          if (rest.includes('Canister Backtrace:')) {
            formattedRest = grayBar + colorLightRed('Canister Backtrace:');
            inBt = true;
          } else if (inBt) {
            formattedRest = grayBar + colorLightRed(rest);
            const t = rest.trim();
            if (t === '.' || t.length === 0) inBt = false;
          }
          this.backtraceOpen.set(short, inBt);
          const rebuilt = `[Canister ${full}] ${formattedRest}`;
          this.push(ensureEndsWithNewline(formatCanisterPrefix(rebuilt, deltaMs)));
        } else {
          // No canister tag present; still try to style backtrace blocks
          if (message.includes('Canister Backtrace:')) {
            this.globalBacktraceOpen = true;
            const grayBar = "\u001b[38;2;107;114;128m|\u001b[0m ";
            this.push(ensureEndsWithNewline(grayBar + colorLightRed('Canister Backtrace:')));
          } else if (this.globalBacktraceOpen) {
            const t = message.trim();
            const grayBar = "\u001b[38;2;107;114;128m|\u001b[0m ";
            this.push(ensureEndsWithNewline(grayBar + colorLightRed(message)));
            if (t === '.' || t.length === 0) this.globalBacktraceOpen = false;
          } else {
            this.push(ensureEndsWithNewline(formatCanisterPrefix(message, deltaMs)));
          }
        }
      } else {
        // Not a timestamped line; still try to style backtrace blocks
        const trimmed = line.replace(/\r?\n$/, '');
        if (trimmed.includes('Canister Backtrace:')) {
          this.globalBacktraceOpen = true;
          const grayBar = "\u001b[38;2;107;114;128m|\u001b[0m ";
          this.push(ensureEndsWithNewline(grayBar + colorLightRed('Canister Backtrace:')));
        } else if (this.globalBacktraceOpen) {
          const grayBar = "\u001b[38;2;107;114;128m|\u001b[0m ";
          const t = trimmed.trim();
          this.push(ensureEndsWithNewline(grayBar + colorLightRed(trimmed)));
          if (t === '.' || t.length === 0) this.globalBacktraceOpen = false;
        } else {
          this.push(formatCanisterPrefix(line));
        }
      }
      callback();
    } catch (err) {
      callback(err as Error);
    }
  }
}

class BacktraceOnlyTransform extends Transform {
  private open = false;
  _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    try {
      const s = chunk.toString('utf8');
      const line = s.replace(/\r?\n$/, '');
      const grayBar = "\u001b[38;2;107;114;128m|\u001b[0m ";
      if (!this.open && line.includes('Canister Backtrace:')) {
        this.open = true;
        this.push(ensureEndsWithNewline(grayBar + colorLightRed('Canister Backtrace:')));
      } else if (this.open) {
        const t = line.trim();
        this.push(ensureEndsWithNewline(grayBar + colorLightRed(line)));
        if (t === '.' || t.length === 0) this.open = false;
      }
      callback();
    } catch (err) {
      callback(err as Error);
    }
  }
}

function ensureEndsWithNewline(s: string): string {
  return s.endsWith('\n') ? s : s + '\n';
}

// Matches: 2025-08-18 12:48:04.625000001 UTC: <message>
const TS_REGEX = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?\s+UTC:\s*(.*)$/;

function parseTimestampedLine(line: string): { tsMs: number; message: string } | undefined {
  const m = TS_REGEX.exec(line.trimEnd());
  if (!m) return undefined;
  const [_, y, mon, d, h, min, s, frac, rest] = m;
  const tsMs = Date.UTC(
    parseInt(y, 10),
    parseInt(mon, 10) - 1,
    parseInt(d, 10),
    parseInt(h, 10),
    parseInt(min, 10),
    parseInt(s, 10),
  );
  const msFromFrac = frac ? Math.floor(parseInt((frac + '000000000').slice(0, 9), 10) / 1_000_000) : 0;
  return { tsMs: tsMs + msFromFrac, message: rest };
}

function formatElapsedInline(deltaMs: number): string {
  let remaining = Math.floor(deltaMs / 1000); // seconds
  const hours = Math.floor(remaining / 3600);
  remaining -= hours * 3600;
  const minutes = Math.floor(remaining / 60);
  remaining -= minutes * 60;
  const seconds = remaining;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0) parts.push(`${minutes} min`);
  if (seconds > 0) parts.push(`${seconds} sec`);
  if (parts.length === 0) parts.push('1 sec');
  return colorBlue(`[⏳ +${parts.join(' ')}]`);
}

function formatCanisterPrefix(s: string, deltaMs?: number): string {
  // Matches: [Canister <principal>] <rest>
  const m = /^\[Canister\s+([^\]]+)\]\s*(.*)$/u.exec(s.replace(/\r?\n$/, ''));
  if (!m) return s;
  const full = m[1];
  const rest = m[2];
  const short = full.split('-').slice(0, 2).join('-');
  const grayStart = '\u001b[38;2;107;114;128m';
  const reset = '\u001b[0m';
  const square = coloredSquare(short);
  const tag = `${grayStart}[${reset}${square}${grayStart}${short}]${reset}`;
  const elapsed = deltaMs !== undefined ? `${formatElapsedInline(deltaMs)}` : '';
  return `${tag}${elapsed} ${rest}\n`;
}

// (colorBluishGray unused here; inline codes are applied directly)

function colorBlue(s: string): string {
  // Tailwind blue-500 approx: rgb(59,130,246)
  const start = '\u001b[38;2;59;130;246m';
  const reset = '\u001b[0m';
  return `${start}${s}${reset}`;
}

function colorLightRed(s: string): string {
  const start = '\u001b[38;2;252;165;165m';
  const reset = '\u001b[0m';
  return `${start}${s}${reset}`;
}

function coloredSquare(seed: string): string {
  const [r, g, b] = pickColor(seed);
  const start = `\u001b[38;2;${r};${g};${b}m`;
  const reset = '\u001b[0m';
  return `${start}■${reset}`;
}

function pickColor(seed: string): [number, number, number] {
  const cached = __PIC_COLOR_CACHE__.get(seed);
  if (cached) return cached;
  // Deterministic hash → hue in [0, 360), fixed saturation/lightness for vivid colors
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const sat = 70; // percent
  const light = 55; // percent
  const rgb = hslToRgb(hue, sat, light);
  __PIC_COLOR_CACHE__.set(seed, rgb);
  return rgb;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const ss = s / 100;
  const ll = l / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) [r, g, b] = [c, x, 0];
  else if (60 <= h && h < 120) [r, g, b] = [x, c, 0];
  else if (120 <= h && h < 180) [r, g, b] = [0, c, x];
  else if (180 <= h && h < 240) [r, g, b] = [0, x, c];
  else if (240 <= h && h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// (no TrapOnlyTransform)
