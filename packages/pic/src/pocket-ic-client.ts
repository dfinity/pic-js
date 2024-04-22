import { IncomingHttpHeaders } from 'http2';
import { Http2Client } from './http2-client';
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
  CanisterCallResponse,
  decodeUploadBlobResponse,
  UploadBlobResponse,
  UploadBlobRequest,
  encodeUploadBlobRequest,
  CreateInstanceRequest,
  encodeCreateInstanceRequest,
  GetPubKeyRequest,
  EncodedGetPubKeyRequest,
  encodeGetPubKeyRequest,
  EncodedSetStableMemoryRequest,
  decodeCanisterCallResponse,
} from './pocket-ic-client-types';

const PROCESSING_TIME_HEADER = 'processing-timeout-ms';
const PROCESSING_TIME_VALUE_MS = 300_000;

export class PocketIcClient {
  private isInstanceDeleted = false;
  private readonly processingHeader: IncomingHttpHeaders;

  private constructor(
    private readonly serverClient: Http2Client,
    private readonly instancePath: string,
    private readonly topology: InstanceTopology,
    processingTimeoutMs: number,
  ) {
    this.processingHeader = {
      [PROCESSING_TIME_HEADER]: processingTimeoutMs.toString(),
    };
  }

  public static async create(
    url: string,
    req?: CreateInstanceRequest,
  ): Promise<PocketIcClient> {
    const serverClient = new Http2Client(url);

    const res = await serverClient.jsonPost<
      EncodedCreateInstanceRequest,
      CreateInstanceResponse
    >({
      path: '/instances',
      body: encodeCreateInstanceRequest(req),
    });

    if ('Error' in res) {
      console.error('Error creating instance', res.Error.message);

      throw new Error(res.Error.message);
    }

    const topology = decodeInstanceTopology(res.Created.topology);
    const instanceId = res.Created.instance_id;

    return new PocketIcClient(
      serverClient,
      `/instances/${instanceId}`,
      topology,
      req?.processingTimeoutMs ?? PROCESSING_TIME_VALUE_MS,
    );
  }

  public async deleteInstance(): Promise<void> {
    this.assertInstanceNotDeleted();

    await this.serverClient.request({
      method: 'DELETE',
      path: this.instancePath,
    });

    this.isInstanceDeleted = true;
  }

  public async tick(): Promise<void> {
    this.assertInstanceNotDeleted();

    return await this.post<void, void>('/update/tick');
  }

  public async getPubKey(req: GetPubKeyRequest): Promise<Uint8Array> {
    this.assertInstanceNotDeleted();

    return await this.post<EncodedGetPubKeyRequest, Uint8Array>(
      '/read/pub_key',
      encodeGetPubKeyRequest(req),
    );
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

    const res = await this.serverClient.request({
      method: 'POST',
      path: '/blobstore',
      body: encodeUploadBlobRequest(req),
    });

    return decodeUploadBlobResponse(res.body);
  }

  public async setStableMemory(req: SetStableMemoryRequest): Promise<void> {
    this.assertInstanceNotDeleted();

    await this.serverClient.jsonPost<EncodedSetStableMemoryRequest, null>({
      path: `${this.instancePath}/update/set_stable_memory`,
      headers: this.processingHeader,
      body: encodeSetStableMemoryRequest(req),
    });
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

  private async post<B, R>(endpoint: string, body?: B): Promise<R> {
    return await this.serverClient.jsonPost<B, R>({
      path: `${this.instancePath}${endpoint}`,
      headers: this.processingHeader,
      body,
    });
  }

  private async get<R extends {}>(endpoint: string): Promise<R> {
    return await this.serverClient.jsonGet<R>({
      path: `${this.instancePath}${endpoint}`,
      headers: this.processingHeader,
    });
  }

  private assertInstanceNotDeleted(): void {
    if (this.isInstanceDeleted) {
      throw new Error('Instance was deleted');
    }
  }
}
