import { Principal } from '@dfinity/principal';
import {
  base64Decode,
  base64Encode,
  base64EncodePrincipal,
  hexDecode,
} from './util';
import {
  HeadersInit,
  HttpClient,
  JSON_HEADER,
  handleFetchError,
} from './http-client';
import {
  AddCanisterCyclesRequest,
  AddCanisterCyclesResponse,
  CanisterCallRequest,
  CanisterCallResponse,
  CheckCanisterExistsRequest,
  CreateInstanceResponse,
  GetCanisterCyclesBalanceRequest,
  GetCanisterCyclesBalanceResponse,
  GetStableMemoryRequest,
  GetStableMemoryResponse,
  GetTimeResponse,
  SetStableMemoryRequest,
  SetTimeRequest,
} from './pocket-ic-client-types';

const PROCESSING_TIME_HEADER = 'processing-timeout-ms';
const PROCESSING_TIME_VALUE_MS = 300_000;
const PROCESSING_HEADER: HeadersInit = {
  [PROCESSING_TIME_HEADER]: PROCESSING_TIME_VALUE_MS.toString(),
};

export class PocketIcClient {
  private isInstanceDeleted = false;

  private constructor(
    private readonly instanceUrl: string,
    private readonly serverUrl: string,
  ) {}

  public static async create(url: string): Promise<PocketIcClient> {
    const instanceId = await PocketIcClient.createInstance(url);

    return new PocketIcClient(`${url}/instances/${instanceId}`, url);
  }

  private static async createInstance(url: string): Promise<number> {
    const response = await HttpClient.post<null, CreateInstanceResponse>(
      `${url}/instances`,
    );

    if ('Error' in response) {
      throw new Error(response.Error.message);
    }

    return response.Created.instance_id;
  }

  public async deleteInstance(): Promise<void> {
    this.assertInstanceNotDeleted();

    await fetch(this.instanceUrl, {
      method: 'DELETE',
    });

    this.isInstanceDeleted = true;
  }

  public async tick(): Promise<void> {
    this.assertInstanceNotDeleted();

    return await this.post<void, void>('/update/tick');
  }

  public async getTime(): Promise<number> {
    this.assertInstanceNotDeleted();

    const response = await this.get<GetTimeResponse>('/read/get_time');

    return response.nanos_since_epoch / 1_000_000;
  }

  public async setTime(time: number): Promise<void> {
    this.assertInstanceNotDeleted();

    await this.post<SetTimeRequest, void>('/update/set_time', {
      nanos_since_epoch: time * 1_000_000,
    });
  }

  public async fetchRootKey(): Promise<Uint8Array> {
    this.assertInstanceNotDeleted();

    return await this.post<null, Uint8Array>('/read/root_key');
  }

  public async checkCanisterExists(canisterId: Principal): Promise<boolean> {
    this.assertInstanceNotDeleted();

    return await this.post<CheckCanisterExistsRequest, boolean>(
      '/read/canister_exists',
      { canister_id: base64EncodePrincipal(canisterId) },
    );
  }

  public async getCyclesBalance(canisterId: Principal): Promise<number> {
    this.assertInstanceNotDeleted();

    const response = await this.post<
      GetCanisterCyclesBalanceRequest,
      GetCanisterCyclesBalanceResponse
    >('/read/get_cycles', {
      canister_id: base64EncodePrincipal(canisterId),
    });

    return response.cycles;
  }

  public async addCycles(
    canisterId: Principal,
    amount: number,
  ): Promise<number> {
    this.assertInstanceNotDeleted();

    const response = await this.post<
      AddCanisterCyclesRequest,
      AddCanisterCyclesResponse
    >('/update/add_cycles', {
      canister_id: base64EncodePrincipal(canisterId),
      amount,
    });

    return response.cycles;
  }

  public async uploadBlob(blob: Uint8Array): Promise<Uint8Array> {
    this.assertInstanceNotDeleted();

    const response = await fetch(`${this.serverUrl}/blobstore`, {
      method: 'POST',
      body: blob,
    });

    const responseText = await response.text();
    return new Uint8Array(hexDecode(responseText));
  }

  public async setStableMemory(
    canisterId: Principal,
    blobId: Uint8Array,
  ): Promise<void> {
    this.assertInstanceNotDeleted();

    const request: SetStableMemoryRequest = {
      canister_id: base64EncodePrincipal(canisterId),
      blob_id: Array.from(blobId),
    };

    const response = await fetch(
      `${this.instanceUrl}/update/set_stable_memory`,
      {
        method: 'POST',
        headers: {
          ...JSON_HEADER,
          ...PROCESSING_HEADER,
        },
        body: JSON.stringify(request),
      },
    );

    handleFetchError(response);
  }

  public async getStableMemory(canisterId: Principal): Promise<Uint8Array> {
    this.assertInstanceNotDeleted();

    const response = await this.post<
      GetStableMemoryRequest,
      GetStableMemoryResponse
    >('/read/get_stable_memory', {
      canister_id: base64EncodePrincipal(canisterId),
    });

    return base64Decode(response.blob);
  }

  public async updateCall(
    canisterId: Principal,
    sender: Principal,
    method: string,
    payload: Uint8Array,
  ): Promise<Uint8Array> {
    this.assertInstanceNotDeleted();

    return await this.canisterCall(
      '/update/execute_ingress_message',
      canisterId,
      sender,
      method,
      payload,
    );
  }

  public async queryCall(
    canisterId: Principal,
    sender: Principal,
    method: string,
    payload: Uint8Array,
  ): Promise<Uint8Array> {
    this.assertInstanceNotDeleted();

    return await this.canisterCall(
      '/read/query',
      canisterId,
      sender,
      method,
      payload,
    );
  }

  private async canisterCall(
    endpoint: string,
    canisterId: Principal,
    sender: Principal,
    method: string,
    payload: Uint8Array,
  ): Promise<Uint8Array> {
    let rawCanisterCall: CanisterCallRequest = {
      sender: base64EncodePrincipal(sender),
      canister_id: base64EncodePrincipal(canisterId),
      method,
      payload: base64Encode(payload),
    };

    const response = await this.post<CanisterCallRequest, CanisterCallResponse>(
      endpoint,
      rawCanisterCall,
    );

    if ('Err' in response) {
      throw new Error(response.Err.description);
    }

    return base64Decode(response.Ok.Reply);
  }

  private async post<P, R>(endpoint: string, body?: P): Promise<R> {
    return await HttpClient.post<P, R>(`${this.instanceUrl}${endpoint}`, {
      body,
      headers: PROCESSING_HEADER,
    });
  }

  private async get<R>(endpoint: string): Promise<R> {
    return await HttpClient.get<R>(`${this.instanceUrl}${endpoint}`, {
      headers: PROCESSING_HEADER,
    });
  }

  private assertInstanceNotDeleted(): void {
    if (this.isInstanceDeleted) {
      throw new Error('Instance was deleted');
    }
  }
}
