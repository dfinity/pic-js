import { RetryableError, ServerError } from '../../../src/error';

describe('RetryableError', () => {
  const error = new RetryableError('Server busy');

  it('should be an instance of Error', () => {
    expect(error).toBeInstanceOf(Error);
  });

  it('should be an instance of RetryableError', () => {
    expect(error).toBeInstanceOf(RetryableError);
  });

  it('should have name set to RetryableError', () => {
    expect(error.name).toBe('RetryableError');
  });

  it('should have the provided message', () => {
    expect(error.message).toBe('Server busy');
  });
});

describe('ServerError', () => {
  const error = new ServerError(
    'SettingTimeIntoPast((1620328630000000003, 946684800000000000))',
  );

  it('should be an instance of Error', () => {
    expect(error).toBeInstanceOf(Error);
  });

  it('should be an instance of ServerError', () => {
    expect(error).toBeInstanceOf(ServerError);
  });

  it('should not be an instance of RetryableError', () => {
    expect(error).not.toBeInstanceOf(RetryableError);
  });

  it('should have name set to ServerError', () => {
    expect(error.name).toBe('ServerError');
  });

  it('should have a prefixed message', () => {
    expect(error.message).toBe(
      'PocketIC server error: SettingTimeIntoPast((1620328630000000003, 946684800000000000))',
    );
  });

  it('should expose the raw server message via serverMessage', () => {
    expect(error.serverMessage).toBe(
      'SettingTimeIntoPast((1620328630000000003, 946684800000000000))',
    );
  });
});
