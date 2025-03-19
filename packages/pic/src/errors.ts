export class Http2ClientError extends Error {
  public override readonly name: string = 'Http2ClientError';
  public readonly response?: Response;

  constructor(message: string, response?: Response) {
    super(message);
    this.response = response;
  }
}

export class ServerBusyError extends Http2ClientError {
  public override readonly name: string = 'ServerBusyError';

  constructor(message: string, response: Response) {
    super(message, response);
  }
}

export class ServerProcessingError extends Http2ClientError {
  public override readonly name: string = 'ServerProcessingError';

  constructor(message: string, response: Response) {
    super(message, response);
  }
}

export class ServerRequestTimeoutError extends Http2ClientError {
  public override readonly name: string = 'ServerRequestTimeoutError';

  constructor() {
    super('A request to the PocketIC server timed out.', undefined);
  }
}

export class ServerResponseError extends Http2ClientError {
  public override readonly name: string = 'ServerResponseError';

  constructor(message: string, response: Response) {
    super(`Server error: ${message}`, response);
  }
}

export class UnknownStateError extends Http2ClientError {
  public override readonly name: string = 'UnknownStateError';

  constructor(response: Response) {
    super('Server returned an unknown state', response);
  }
}

export class InstanceDeletedError extends Error {
  public override readonly name: string = 'InstanceDeletedError';

  constructor() {
    super(
      'This PocketIC instance has been torn down. Please create a new instance before interacting further with PocketIC.',
    );
  }
}
