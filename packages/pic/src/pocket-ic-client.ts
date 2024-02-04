import {
  HeadersInit,
  HttpClient,
  JSON_HEADER,
  handleFetchError,
} from './http-client';
import {
  EncodedAddCyclesRequest,
  EncodedAddCyclesResponse,
  EncodedCanisterCallRequest,
  EncodedCanisterCallResponse,
  EncodedGetSubnetIdRequest,
  EncodedCreateInstanceRequest,
  CreateInstanceResponse,
  EncodedGetCyclesBalanceRequest,
  EncodedGetStableMemoryRequest,
  EncodedGetStableMemoryResponse,
  EncodedGetTimeResponse,
  EncodedSetTimeRequest,
  EncodedGetSubnetIdResponse,
  SubnetTopology,
  decodeInstanceTopology,
  InstanceTopology,
  GetStableMemoryRequest,
  encodeGetStableMemoryRequest,
  GetStableMemoryResponse,
  decodeGetStableMemoryResponse,
  SetStableMemoryRequest,
  encodeSetStableMemoryRequest,
  AddCyclesRequest,
  encodeAddCyclesRequest,
  AddCyclesResponse,
  decodeAddCyclesResponse,
  EncodedGetCyclesBalanceResponse,
  GetCyclesBalanceResponse,
  decodeGetCyclesBalanceResponse,
  encodeGetCyclesBalanceRequest,
  GetCyclesBalanceRequest,
  GetSubnetIdResponse,
  GetSubnetIdRequest,
  encodeGetSubnetIdRequest,
  decodeGetSubnetIdResponse,
  GetTimeResponse,
  decodeGetTimeResponse,
  SetTimeRequest,
  encodeSetTimeRequest,
  CanisterCallRequest,
  encodeCanisterCallRequest,
  decodeCanisterCallResponse,
  CanisterCallResponse,
  decodeUploadBlobResponse,
  UploadBlobResponse,
  UploadBlobRequest,
  encodeUploadBlobRequest,
  CreateInstanceRequest,
  encodeCreateInstanceRequest,
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
    private readonly topology: InstanceTopology,
  ) {}

  public static async create(
    url: string,
    req?: CreateInstanceRequest,
  ): Promise<PocketIcClient> {
    const [instanceId, topology] = await PocketIcClient.createInstance(
      url,
      req,
    );

    return new PocketIcClient(`${url}/instances/${instanceId}`, url, topology);
  }

  private static async createInstance(
    url: string,
    req?: CreateInstanceRequest,
  ): Promise<[number, Record<string, SubnetTopology>]> {
    const res = await HttpClient.post<
      EncodedCreateInstanceRequest,
      CreateInstanceResponse
    >(`${url}/instances`, { body: encodeCreateInstanceRequest(req) });

    if ('Error' in res) {
      throw new Error(res.Error.message);
    }

    const topology = decodeInstanceTopology(res.Created.topology);

    return [res.Created.instance_id, topology];
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

  public async fetchRootKey(): Promise<Uint8Array> {
    this.assertInstanceNotDeleted();

    return await this.post<null, Uint8Array>('/read/pub_key');
  }

  public getTopology(): InstanceTopology {
    return this.topology;
  }

  public async getTime(): Promise<GetTimeResponse> {
    this.assertInstanceNotDeleted();

    const res = await this.get<EncodedGetTimeResponse>('/read/get_time');

    return decodeGetTimeResponse(res);
  }

  public async setTime(req: SetTimeRequest): Promise<void> {
    this.assertInstanceNotDeleted();

    await this.post<EncodedSetTimeRequest, void>(
      '/update/set_time',
      encodeSetTimeRequest(req),
    );
  }

  public async getSubnetId(
    req: GetSubnetIdRequest,
  ): Promise<GetSubnetIdResponse> {
    this.assertInstanceNotDeleted();

    const res = await this.post<
      EncodedGetSubnetIdRequest,
      EncodedGetSubnetIdResponse
    >('/read/get_subnet', encodeGetSubnetIdRequest(req));

    return decodeGetSubnetIdResponse(res);
  }

  public async getCyclesBalance(
    req: GetCyclesBalanceRequest,
  ): Promise<GetCyclesBalanceResponse> {
    this.assertInstanceNotDeleted();

    const res = await this.post<
      EncodedGetCyclesBalanceRequest,
      EncodedGetCyclesBalanceResponse
    >('/read/get_cycles', encodeGetCyclesBalanceRequest(req));

    return decodeGetCyclesBalanceResponse(res);
  }

  public async addCycles(req: AddCyclesRequest): Promise<AddCyclesResponse> {
    this.assertInstanceNotDeleted();

    const res = await this.post<
      EncodedAddCyclesRequest,
      EncodedAddCyclesResponse
    >('/update/add_cycles', encodeAddCyclesRequest(req));

    return decodeAddCyclesResponse(res);
  }

  public async uploadBlob(req: UploadBlobRequest): Promise<UploadBlobResponse> {
    this.assertInstanceNotDeleted();

    const res = await fetch(`${this.serverUrl}/blobstore`, {
      method: 'POST',
      body: encodeUploadBlobRequest(req),
    });

    return decodeUploadBlobResponse(await res.text());
  }

  public async setStableMemory(req: SetStableMemoryRequest): Promise<void> {
    this.assertInstanceNotDeleted();

    // this endpoint does not return JSON encoded responses,
    // so we make this request directly using fetch to avoid the automatic JSON decoding
    // from HttpClient.post
    const res = await fetch(`${this.instanceUrl}/update/set_stable_memory`, {
      method: 'POST',
      headers: {
        ...JSON_HEADER,
        ...PROCESSING_HEADER,
      },
      body: JSON.stringify(encodeSetStableMemoryRequest(req)),
    });

    handleFetchError(res);
  }

  public async getStableMemory(
    req: GetStableMemoryRequest,
  ): Promise<GetStableMemoryResponse> {
    this.assertInstanceNotDeleted();

    const res = await this.post<
      EncodedGetStableMemoryRequest,
      EncodedGetStableMemoryResponse
    >('/read/get_stable_memory', encodeGetStableMemoryRequest(req));

    return decodeGetStableMemoryResponse(res);
  }

  public async updateCall(
    req: CanisterCallRequest,
  ): Promise<CanisterCallResponse> {
    this.assertInstanceNotDeleted();

    return await this.canisterCall('/update/execute_ingress_message', req);
  }

  public async queryCall(
    req: CanisterCallRequest,
  ): Promise<CanisterCallResponse> {
    this.assertInstanceNotDeleted();

    return await this.canisterCall('/read/query', req);
  }

  private async canisterCall(
    endpoint: string,
    req: CanisterCallRequest,
  ): Promise<CanisterCallResponse> {
    const res = await this.post<
      EncodedCanisterCallRequest,
      EncodedCanisterCallResponse
    >(endpoint, encodeCanisterCallRequest(req));

    return decodeCanisterCallResponse(res);
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
