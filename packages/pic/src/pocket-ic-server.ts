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

export class PocketIcServer {
  private readonly url: string;

  private constructor(
    private readonly serverProcess: ChildProcess,
    portNumber: number,
  ) {
    this.url = `http://127.0.0.1:${portNumber}`;
  }

  public static async start(): Promise<PocketIcServer> {
    const binPath = this.getBinPath();
    await this.assertBinExists(binPath);

    const pid = process.ppid;
    const picFilePrefix = `pocket_ic_${pid}`;
    const portFilePath = tmpFile(`${picFilePrefix}.port`);
    const readyFilePath = tmpFile(`${picFilePrefix}.ready`);

    const serverProcess = spawn(binPath, ['--pid', pid.toString()], {
      stdio: 'ignore',
      env: {
        POCKET_IC_LOG_DIR: resolve(__dirname, '..', 'logs'),
        POCKET_IC_LOG_DIR_LEVELS:
          'pocket_ic_server=trace,tower_http=trace,axum=trace',
      },
    });

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

  public getUrl(): string {
    return this.url;
  }

  public stop(): void {
    this.serverProcess.unref();
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
