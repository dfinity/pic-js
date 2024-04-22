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
  poll,
  isArm,
  isDarwin,
} from './util';
import { StartServerOptions } from './pocket-ic-server-types';

/**
 * This class represents the main PocketIC server.
 * It is responsible for maintaining the lifecycle of the server process.
 * See {@link PocketIc} for details on the client to use with this server.
 *
 * @category API
 *
 * @example
 * ```ts
 * import { PocketIc, PocketIcServer } from '@hadronous/pic';
 * import { _SERVICE, idlFactory } from '../declarations';
 *
 * const wasmPath = resolve('..', '..', 'canister.wasm');
 *
 * const picServer = await PocketIcServer.create();
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
    const readyFilePath = tmpFile(`${picFilePrefix}.ready`);

    const serverProcess = spawn(binPath, ['--pid', pid.toString()]);

    if (options.showRuntimeLogs) {
      serverProcess.stdout.pipe(process.stdout);
    }

    if (options.showCanisterLogs) {
      serverProcess.stderr.pipe(process.stderr);
    }

    serverProcess.on('error', error => {
      if (isArm() && isDarwin()) {
        throw new BinStartMacOSArmError(error);
      }

      throw new BinStartError(error);
    });

    return await poll(async () => {
      const isPocketIcReady = await exists(readyFilePath);

      if (isPocketIcReady) {
        const portString = await readFileAsString(portFilePath);
        const port = parseInt(portString);

        return new PocketIcServer(serverProcess, port);
      }

      throw new BinTimeoutError();
    });
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
