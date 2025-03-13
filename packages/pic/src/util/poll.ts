import { ExponentialBackoff } from '@dfinity/agent/lib/cjs/polling/backoff';

export interface PollOptions {
  intervalMs: number;
  timeoutMs: number;
  retryTimes?: number;
}

export async function poll<T extends (...args: any) => any>(
  cb: T,
  { intervalMs, timeoutMs, retryTimes = 3 }: PollOptions,
): Promise<ReturnType<T>> {
  const startTimeMs = Date.now();
  const backoff = new ExponentialBackoff({
    maxIterations: retryTimes,
    initialInterval: intervalMs,
    maxElapsedTime: timeoutMs,
  });

  return new Promise((resolve, reject) => {
    async function runPoll(): Promise<void> {
      const currentTimeMs = Date.now();

      try {
        const result = await cb();
        return resolve(result);
      } catch (e) {
        const nextInterval = backoff.next();
        if (currentTimeMs - startTimeMs >= timeoutMs) {
          return reject(e);
        }
        if (nextInterval === null) {
          return reject(e);
        }
        setTimeout(runPoll, nextInterval);
      }
    }

    runPoll();
  });
}
