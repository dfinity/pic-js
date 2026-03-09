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
    let calls = 0;

    await expect(
      poll(
        () => {
          calls++;
          throw new Error('fatal error');
        },
        { intervalMs: 10, timeoutMs: 5000 },
      ),
    ).rejects.toThrow('fatal error');

    expect(calls).toBe(1);
  });

  it('should immediately reject with a ServerError instance and preserve serverMessage', async () => {
    let calls = 0;

    const err = await poll(
      () => {
        calls++;
        throw new ServerError('something went wrong');
      },
      { intervalMs: 10, timeoutMs: 5000 },
    ).catch(e => e);

    expect(calls).toBe(1);
    expect(err).toBeInstanceOf(ServerError);
    expect(err).not.toBeInstanceOf(RetryableError);
    expect((err as ServerError).name).toBe('ServerError');
    expect((err as ServerError).serverMessage).toBe('something went wrong');
    expect((err as ServerError).message).toBe(
      'PocketIC server error: something went wrong',
    );
  });
});
