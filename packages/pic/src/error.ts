export class BinStartError extends Error {
  override readonly name = 'BinStartError';

  constructor(cause: Error) {
    super(
      `There was an error starting the PocketIC Binary.

Original error: ${cause.name} ${cause.message}.
${cause.stack}`,
      { cause },
    );
  }
}

export class BinStartMacOSArmError extends Error {
  override readonly name = 'BinStartMacOSArmError';

  constructor(cause: Error) {
    super(
      `There was an error starting the PocketIC Binary.

It seems you are running on an Apple Silicon Mac. The PocketIC binary can not run with the ARM architecture on Apple Silicon Macs.
Please install and enable Rosetta if it is not enabled and try again.

Original error: ${cause.name} ${cause.message}.
${cause.stack}`,
      { cause },
    );
  }
}

export class BinNotFoundError extends Error {
  override readonly name = 'BinNotFoundError';

  constructor(picBinPath: string) {
    super(
      `Could not find the PocketIC binary. The PocketIC binary could not be found at ${picBinPath}. Please try installing @dfinity/pic again.`,
    );
  }
}

export class ServerRequestTimeoutError extends Error {
  override readonly name = 'ServerRequestTimeoutError';

  constructor() {
    super('A request to the PocketIC server timed out.');
  }
}

export class InstanceDeletedError extends Error {
  override readonly name = 'InstanceDeletedError';

  constructor() {
    super(
      'This PocketIC instance has been torn down. Please create a new instance before interacting further with PocketIC.',
    );
  }
}

export class TopologyValidationError extends Error {
  override readonly name = 'TopologyValidationError';

  constructor() {
    super(
      'The provided subnet configuration is invalid. At least one subnet must be configured and the number of both application and system subnets must be at least 0 (non-negative).',
    );
  }
}

export class RetryableError extends Error {
  override readonly name: string = 'RetryableError';
}

export class BinTimeoutError extends RetryableError {
  override readonly name = 'BinTimeoutError';

  constructor() {
    super('The PocketIC binary took too long to start. Please try again.');
  }
}

export class ServerError extends Error {
  override readonly name = 'ServerError';
  public readonly serverMessage: string;

  constructor(serverMessage: string) {
    super(`PocketIC server error: ${serverMessage}`);
    this.serverMessage = serverMessage;
  }
}
