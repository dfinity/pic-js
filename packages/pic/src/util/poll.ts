import { RetryableError } from '../error';

export interface PollOptions {
  intervalMs: number;
  timeoutMs: number;
}

export async function poll<T extends (...args: any) => any>(
  cb: T,
  { intervalMs, timeoutMs }: PollOptions,
): Promise<ReturnType<T>> {
  const startTimeMs = Date.now();

  return new Promise((resolve, reject) => {
    async function runPoll(): Promise<void> {
      try {
        const result = await cb();
        return resolve(result);
      } catch (e) {
        if (!(e instanceof RetryableError)) {
          return reject(e);
        }

        if (Date.now() - startTimeMs >= timeoutMs) {
          return reject(e);
        }

        setTimeout(runPoll, intervalMs);
      }
    }

    runPoll();
  });
}
