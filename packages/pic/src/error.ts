export class BinStartError extends Error {
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
  constructor(picBinPath: string) {
    super(
      `Could not find the PocketIC binary. The PocketIC binary could not be found at ${picBinPath}. Please try installing @hadronous/pic again.`,
    );
  }
}

export class BinTimeoutError extends Error {
  constructor() {
    super('The PocketIC binary took too long to start. Please try again.');
  }
}
