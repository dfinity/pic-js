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
      const currentTimeMs = Date.now();

      try {
        const result = await cb();
        return resolve(result);
      } catch (e) {
        if (currentTimeMs - startTimeMs >= timeoutMs) {
          return reject(e);
        }

        setTimeout(runPoll, intervalMs);
      }
    }

    runPoll();
  });
}
