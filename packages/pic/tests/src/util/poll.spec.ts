import { RetryableError, ServerError } from '../../../src/error';
import { poll } from '../../../src/util/poll';

describe('poll', () => {
  it('should resolve when the callback succeeds immediately', async () => {
    const result = await poll(() => 'success', {
      intervalMs: 10,
      timeoutMs: 1000,
    });

    expect(result).toBe('success');
  });

  it('should retry on RetryableError and resolve when eventually successful', async () => {
    let attempts = 0;

    const result = await poll(
      () => {
        attempts++;
        if (attempts < 3) {
          throw new RetryableError('not ready');
        }
        return 'success';
      },
      { intervalMs: 10, timeoutMs: 1000 },
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should reject with a RetryableError instance after timeout', async () => {
    const rejection = poll(
      () => {
        throw new RetryableError('always busy');
      },
      { intervalMs: 10, timeoutMs: 50 },
    );

    await expect(rejection).rejects.toBeInstanceOf(RetryableError);
    await expect(rejection).rejects.toThrow('always busy');
  });

  it('should immediately reject on non-retryable Error', async () => {
    const startTime = Date.now();

    await expect(
      poll(
        () => {
          throw new Error('fatal error');
        },
        { intervalMs: 10, timeoutMs: 5000 },
      ),
    ).rejects.toThrow('fatal error');

    expect(Date.now() - startTime).toBeLessThan(1000);
  });

  it('should immediately reject with a ServerError instance and preserve serverMessage', async () => {
    const startTime = Date.now();

    try {
      await poll(
        () => {
          throw new ServerError('SettingTimeIntoPast');
        },
        { intervalMs: 10, timeoutMs: 5000 },
      );
      fail('Expected poll to reject');
    } catch (e) {
      expect(e).toBeInstanceOf(ServerError);
      expect(e).not.toBeInstanceOf(RetryableError);
      expect((e as ServerError).name).toBe('ServerError');
      expect((e as ServerError).serverMessage).toBe('SettingTimeIntoPast');
      expect((e as ServerError).message).toBe(
        'PocketIC server error: SettingTimeIntoPast',
      );
    }

    expect(Date.now() - startTime).toBeLessThan(1000);
  });
});
