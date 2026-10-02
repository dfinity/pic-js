import { Principal } from '@icp-sdk/core/principal';
import {
  canisterSnapshotFromIDL,
  isNil,
  canisterSettingsToIDL,
  optCanisterLogFilterToIDL,
  visibilityFromIDL,
  optional,
  readFileAsBytes,
  sha256,
  splitIntoChunks,
} from './util';
import { PocketIcClient } from './pocket-ic-client';
import { ActorInterface, Actor, createActorClass } from './pocket-ic-actor';
import {
  CanisterFixture,
  CreateActorOptions,
  CreateCanisterOptions,
  CreateInstanceOptions,
  InstallCodeOptions,
  ReinstallCodeOptions,
  SetupCanisterOptions,
  UpgradeCanisterOptions,
  SubnetTopology,
  SubnetType,
  UpdateCanisterSettingsOptions,
  StartCanisterOptions,
  StopCanisterOptions,
  DeleteCanisterOptions,
  UninstallCodeOptions,
  SubmittedCall,
  IngressStatusOptions,
  VerifyCanisterSignatureOptions,
  MakeLiveOptions,
  QueryCallOptions,
  UpdateCallOptions,
  PendingHttpsOutcall,
  MockPendingHttpsOutcallOptions,
  CanisterStatusOptions,
  CanisterStatusResult,
  FetchCanisterLogsOptions,
  CanisterLogRecord,
  CanisterSnapshot,
  CanisterSnapshotOptions,
  DownloadCanisterSnapshotOptions,
  ListCanisterSnapshotsOptions,
  TakeCanisterSnapshotOptions,
  UploadCanisterSnapshotOptions,
} from './pocket-ic-types';
import {
  MANAGEMENT_CANISTER_ID,
  CanisterInstallMode,
  ChunkHash,
  decodeCreateCanisterResponse,
  decodeUploadChunkResponse,
  encodeClearChunkStoreRequest,
  encodeCreateCanisterRequest,
  encodeInstallChunkedCodeRequest,
  encodeInstallCodeRequest,
  encodeStartCanisterRequest,
  encodeStopCanisterRequest,
  encodeDeleteCanisterRequest,
  encodeUninstallCodeRequest,
  encodeUpdateCanisterSettingsRequest,
  encodeUploadChunkRequest,
  decodeCanisterStatusResponse,
  encodeCanisterStatusRequest,
  encodeFetchCanisterLogsRequest,
  decodeFetchCanisterLogsResponse,
  decodeListCanisterSnapshotsResponse,
  decodeTakeCanisterSnapshotResponse,
  encodeDeleteCanisterSnapshotRequest,
  encodeListCanisterSnapshotsRequest,
  encodeLoadCanisterSnapshotRequest,
  encodeTakeCanisterSnapshotRequest,
} from './management-canister';
import {
  createDeferredActorClass,
  DeferredActor,
} from './pocket-ic-deferred-actor';

const NANOS_PER_MILLISECOND = BigInt(1_000_000);

// The IC ingress message limit is 2 MB, but that covers the entire message
// envelope (signature, delegations, Candid overhead, etc.).
// We use 1.85 MB to leave headroom for that overhead.
const MAX_INSTALL_CODE_PAYLOAD_SIZE = 1_850_000;
const WASM_CHUNK_SIZE = 1_000_000;
const CHUNK_UPLOAD_BATCH_SIZE = 12;

/**
 * This class represents the main PocketIC client.
 * It is responsible for interacting with the PocketIC server via the REST API.
 * See {@link PocketIcServer} for details on the server to use with this client.
 *
 * @category API
 *
 * @example
 * The easist way to use PocketIC is to use {@link setupCanister} convenience method:
 * ```ts
 * import { PocketIc, PocketIcServer } from '@dfinity/pic';
 * import { _SERVICE, idlFactory } from '../declarations';
 *
 * const wasmPath = resolve('..', '..', 'canister.wasm');
 *
 * const picServer = await PocketIcServer.start();
 * const pic = await PocketIc.create(picServer.getUrl());
 *
 * const fixture = await pic.setupCanister<_SERVICE>({ idlFactory, wasmPath });
 * const { actor } = fixture;
 *
 * // perform tests...
 *
 * await pic.tearDown();
 * await picServer.stop();
 * ```
 *
 * If more control is needed, then the {@link createCanister}, {@link installCode} and
 * {@link createActor} methods can be used directly:
 * ```ts
 * import { PocketIc, PocketIcServer } from '@dfinity/pic';
 * import { _SERVICE, idlFactory } from '../declarations';
 *
 * const wasm = resolve('..', '..', 'canister.wasm');
 *
 * const picServer = await PocketIcServer.start();
 * const pic = await PocketIc.create(picServer.getUrl());
 *
 * const canisterId = await pic.createCanister();
 * await pic.installCode({ canisterId, wasm });
 * const actor = pic.createActor<_SERVICE>({ idlFactory, canisterId });
 *
 * // perform tests...
 *
 * await pic.tearDown();
 * await picServer.stop();
 * ```
 */
export class PocketIc {
  private httpGatewayPort: number | null = null;

  private constructor(private readonly client: PocketIcClient) {}

  /**
   * Creates a PocketIC instance.
   *
   * @param url The URL of an existing PocketIC server to connect to.
   * @param options Options for creating the PocketIC instance see {@link CreateInstanceOptions}.
   * @returns A new PocketIC instance.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const fixture = await pic.setupCanister<_SERVICE>({ idlFactory, wasmPath });
   * const { actor } = fixture;
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public static async create(
    url: string,
    options?: CreateInstanceOptions,
  ): Promise<PocketIc> {
    const client = await PocketIcClient.create(url, options);

    return new PocketIc(client);
  }

  /**
   * A convenience method that creates a new canister,
   * installs the given WASM module to it and returns a typesafe {@link Actor}
   * that implements the Candid interface of the canister.
   * To just create a canister, see {@link createCanister}.
   * To just install code to an existing canister, see {@link installCode}.
   * To just create an Actor for an existing canister, see {@link createActor}.
   *
   * @param options Options for setting up the canister, see {@link SetupCanisterOptions}.
   * @returns The {@link Actor} instance.
   *
   * @see [Candid](https://docs.internetcomputer.org/references/candid-spec/)
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   * import { _SERVICE, idlFactory } from '../declarations';
   *
   * const wasmPath = resolve('..', '..', 'canister.wasm');
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const fixture = await pic.setupCanister<_SERVICE>({ idlFactory, wasmPath });
   * const { actor } = fixture;
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async setupCanister<T extends ActorInterface<T> = ActorInterface>({
    sender,
    arg,
    wasm,
    idlFactory,
    targetSubnetId,
    ...createCanisterOptions
  }: SetupCanisterOptions): Promise<CanisterFixture<T>> {
    const canisterId = await this.createCanister({
      ...createCanisterOptions,
      targetSubnetId,
      sender,
    });

    await this.installCode({ canisterId, wasm, arg, sender, targetSubnetId });

    const actor = this.createActor<T>({ idlFactory, canisterId });

    return { actor, canisterId };
  }

  /**
   * Creates a new canister.
   * For a more convenient way of creating a PocketIC instance,
   * creating a canister and installing code, see {@link setupCanister}.
   *
   * @param options Options for creating the canister, see {@link CreateCanisterOptions}.
   * @returns The Principal of the newly created canister.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const canisterId = await pic.createCanister();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async createCanister({
    sender = Principal.anonymous(),
    cycles = 1_000_000_000_000_000_000n,
    targetCanisterId,
    targetSubnetId,
    ...settings
  }: CreateCanisterOptions = {}): Promise<Principal> {
    const payload = encodeCreateCanisterRequest({
      settings: [canisterSettingsToIDL(settings)],
      amount: [cycles],
      specified_id: optional(targetCanisterId),
    });

    const res = await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'provisional_create_canister_with_cycles',
      payload,
      effectivePrincipal: targetSubnetId
        ? {
            subnetId: targetSubnetId,
          }
        : undefined,
    });

    return decodeCreateCanisterResponse(res.body).canister_id;
  }

  /**
   * Starts the given canister.
   *
   * @param options Options for starting the canister, see {@link StartCanisterOptions}.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.startCanister({ canisterId });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async startCanister({
    canisterId,
    sender = Principal.anonymous(),
    targetSubnetId,
  }: StartCanisterOptions): Promise<void> {
    const payload = encodeStartCanisterRequest({
      canister_id: canisterId,
    });

    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'start_canister',
      payload,
      effectivePrincipal: targetSubnetId
        ? {
            subnetId: targetSubnetId,
          }
        : undefined,
    });
  }

  /**
   * Stops the given canister.
   *
   * @param options Options for stopping the canister, see {@link StopCanisterOptions}.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.stopCanister({ canisterId });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async stopCanister({
    canisterId,
    sender = Principal.anonymous(),
    targetSubnetId,
  }: StopCanisterOptions): Promise<void> {
    const payload = encodeStopCanisterRequest({
      canister_id: canisterId,
    });

    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'stop_canister',
      payload,
      effectivePrincipal: targetSubnetId
        ? {
            subnetId: targetSubnetId,
          }
        : undefined,
    });
  }

  /**
   * Deletes the given canister. The canister must be stopped first,
   * see {@link stopCanister}.
   *
   * @param options Options for deleting the canister, see {@link DeleteCanisterOptions}.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * await pic.stopCanister({ canisterId, sender });
   * await pic.deleteCanister({ canisterId, sender });
   *
   * const exists = await pic.canisterExists(canisterId); // false
   * ```
   */
  public async deleteCanister({
    canisterId,
    sender = Principal.anonymous(),
    targetSubnetId,
  }: DeleteCanisterOptions): Promise<void> {
    const payload = encodeDeleteCanisterRequest({
      canister_id: canisterId,
    });

    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'delete_canister',
      payload,
      effectivePrincipal: targetSubnetId
        ? {
            subnetId: targetSubnetId,
          }
        : undefined,
    });
  }

  /**
   * Uninstalls the code of the given canister, removing its WASM module and
   * memory. The canister and its settings are kept.
   *
   * @param options Options for uninstalling the code, see {@link UninstallCodeOptions}.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * await pic.uninstallCode({ canisterId, sender });
   *
   * const { moduleHash } = await pic.canisterStatus({ canisterId, sender }); // null
   * ```
   */
  public async uninstallCode({
    canisterId,
    sender = Principal.anonymous(),
    targetSubnetId,
  }: UninstallCodeOptions): Promise<void> {
    const payload = encodeUninstallCodeRequest({
      canister_id: canisterId,
      sender_canister_version: [],
    });

    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'uninstall_code',
      payload,
      effectivePrincipal: targetSubnetId
        ? {
            subnetId: targetSubnetId,
          }
        : undefined,
    });
  }

  /**
   * Installs the given WASM module to the provided canister.
   * To create a canister to install code to, see {@link createCanister}.
   * For a more convenient way of creating a PocketIC instance,
   * creating a canister and installing code, see {@link setupCanister}.
   *
   * @param options Options for installing the code, see {@link InstallCodeOptions}.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   * import { resolve } from 'node:path';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   * const wasm = resolve('..', '..', 'canister.wasm');
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.installCode({ canisterId, wasm });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async installCode({
    arg = new Uint8Array(),
    sender = Principal.anonymous(),
    canisterId,
    wasm,
    targetSubnetId,
  }: InstallCodeOptions): Promise<void> {
    if (typeof wasm === 'string') {
      wasm = await readFileAsBytes(wasm);
    }

    if (wasm.byteLength + arg.byteLength > MAX_INSTALL_CODE_PAYLOAD_SIZE) {
      return this.installCodeChunked({
        wasm,
        arg,
        canisterId,
        mode: { install: null },
        sender,
        targetSubnetId,
      });
    }

    const payload = encodeInstallCodeRequest({
      arg: new Uint8Array(arg),
      canister_id: canisterId,
      mode: {
        install: null,
      },
      wasm_module: new Uint8Array(wasm),
    });

    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'install_code',
      payload,
      effectivePrincipal: targetSubnetId
        ? {
            subnetId: targetSubnetId,
          }
        : undefined,
    });
  }

  /**
   * Reinstalls the given WASM module to the provided canister.
   * This will reset both the canister's heap and its stable memory.
   * To create a canister to upgrade, see {@link createCanister}.
   * To install the initial WASM module to a new canister, see {@link installCode}.
   *
   * @param options Options for reinstalling the code, see {@link ReinstallCodeOptions}.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   * import { resolve } from 'node:path';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   * const wasm = resolve('..', '..', 'canister.wasm');
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.reinstallCode({ canisterId, wasm });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async reinstallCode({
    sender = Principal.anonymous(),
    arg = new Uint8Array(),
    canisterId,
    wasm,
  }: ReinstallCodeOptions): Promise<void> {
    if (typeof wasm === 'string') {
      wasm = await readFileAsBytes(wasm);
    }

    if (wasm.byteLength + arg.byteLength > MAX_INSTALL_CODE_PAYLOAD_SIZE) {
      return this.installCodeChunked({
        wasm,
        arg,
        canisterId,
        mode: { reinstall: null },
        sender,
      });
    }

    const payload = encodeInstallCodeRequest({
      arg: new Uint8Array(arg),
      canister_id: canisterId,
      mode: {
        reinstall: null,
      },
      wasm_module: new Uint8Array(wasm),
    });

    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'install_code',
      payload,
    });
  }

  /**
   * Upgrades the given canister with the given WASM module.
   * This will reset the canister's heap, but preserve stable memory.
   * To create a canister to upgrade to, see {@link createCanister}.
   * To install the initial WASM module to a new canister, see {@link installCode}.
   *
   * @param options Options for upgrading the canister, see {@link UpgradeCanisterOptions}.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   * import { resolve } from 'node:path';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   * const wasm = resolve('..', '..', 'canister.wasm');
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.upgradeCanister({ canisterId, wasm });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async upgradeCanister({
    sender = Principal.anonymous(),
    arg = new Uint8Array(),
    canisterId,
    wasm,
    upgradeModeOptions,
  }: UpgradeCanisterOptions): Promise<void> {
    if (typeof wasm === 'string') {
      wasm = await readFileAsBytes(wasm);
    }

    if (wasm.byteLength + arg.byteLength > MAX_INSTALL_CODE_PAYLOAD_SIZE) {
      return this.installCodeChunked({
        wasm,
        arg,
        canisterId,
        mode: { upgrade: optional(upgradeModeOptions) },
        sender,
      });
    }

    const payload = encodeInstallCodeRequest({
      arg: new Uint8Array(arg),
      canister_id: canisterId,
      mode: {
        upgrade: optional(upgradeModeOptions),
      },
      wasm_module: new Uint8Array(wasm),
    });

    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'install_code',
      payload,
    });
  }

  /**
   * Updates the settings of the given canister.
   *
   * @param options Options for updating the canister settings, see {@link UpdateCanisterSettingsOptions}.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.updateCanisterSettings({
   *  canisterId,
   *  controllers: [Principal.fromUint8Array(new Uint8Array([1]))],
   * });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async updateCanisterSettings({
    canisterId,
    sender = Principal.anonymous(),
    ...settings
  }: UpdateCanisterSettingsOptions): Promise<void> {
    const payload = encodeUpdateCanisterSettingsRequest({
      canister_id: canisterId,
      settings: canisterSettingsToIDL(settings),
    });

    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'update_settings',
      payload,
    });
  }

  /**
   * Returns the status of the given canister.
   *
   * @param options Options for querying the canister status, see {@link CanisterStatusOptions}.
   * @returns The canister status, see {@link CanisterStatusResult}.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const status = await pic.canisterStatus({ canisterId });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async canisterStatus({
    canisterId,
    sender = Principal.anonymous(),
  }: CanisterStatusOptions): Promise<CanisterStatusResult> {
    const payload = encodeCanisterStatusRequest({
      canister_id: canisterId,
    });

    const res = await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'canister_status',
      payload,
    });

    const {
      settings,
      memory_metrics: memory,
      ...response
    } = decodeCanisterStatusResponse(res.body);

    return {
      status: response.status,
      readyForMigration: response.ready_for_migration,
      version: response.version,
      settings: {
        controllers: settings.controllers,
        computeAllocation: settings.compute_allocation,
        memoryAllocation: settings.memory_allocation,
        freezingThreshold: settings.freezing_threshold,
        reservedCyclesLimit: settings.reserved_cycles_limit,
        minimumIncomingCanisterCallCycles:
          settings.minimum_incoming_canister_call_cycles,
        logVisibility: visibilityFromIDL(settings.log_visibility),
        logMemoryLimit: settings.log_memory_limit,
        snapshotVisibility: visibilityFromIDL(settings.snapshot_visibility),
        statusVisibility: visibilityFromIDL(settings.status_visibility),
        wasmMemoryLimit: settings.wasm_memory_limit,
        wasmMemoryThreshold: settings.wasm_memory_threshold,
        environmentVariables: settings.environment_variables,
      },
      moduleHash: response.module_hash[0] ?? null,
      memorySize: response.memory_size,
      memoryMetrics: {
        wasmMemorySize: memory.wasm_memory_size,
        stableMemorySize: memory.stable_memory_size,
        globalMemorySize: memory.global_memory_size,
        wasmBinarySize: memory.wasm_binary_size,
        customSectionsSize: memory.custom_sections_size,
        canisterHistorySize: memory.canister_history_size,
        wasmChunkStoreSize: memory.wasm_chunk_store_size,
        snapshotsSize: memory.snapshots_size,
        logMemoryStoreSize: memory.log_memory_store_size,
      },
      cycles: response.cycles,
      reservedCycles: response.reserved_cycles,
      idleCyclesBurnedPerDay: response.idle_cycles_burned_per_day,
      queryStats: {
        numCallsTotal: response.query_stats.num_calls_total,
        numInstructionsTotal: response.query_stats.num_instructions_total,
        requestPayloadBytesTotal:
          response.query_stats.request_payload_bytes_total,
        responsePayloadBytesTotal:
          response.query_stats.response_payload_bytes_total,
      },
    };
  }

  /**
   * Takes a snapshot of the given canister's code and memory,
   * which {@link loadCanisterSnapshot} restores. Canister settings are not included.
   *
   * @param options Options for taking the snapshot, see {@link TakeCanisterSnapshotOptions}.
   * @returns The snapshot, see {@link CanisterSnapshot}.
   *
   * @example
   * ```ts
   * const snapshot = await pic.takeCanisterSnapshot({ canisterId, sender });
   *
   * // change the canister's state...
   *
   * await pic.loadCanisterSnapshot({
   *   canisterId,
   *   snapshotId: snapshot.id,
   *   sender,
   * });
   * ```
   */
  public async takeCanisterSnapshot({
    canisterId,
    replaceSnapshot,
    uninstallCode,
    sender = Principal.anonymous(),
  }: TakeCanisterSnapshotOptions): Promise<CanisterSnapshot> {
    const res = await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'take_canister_snapshot',
      payload: encodeTakeCanisterSnapshotRequest({
        canister_id: canisterId,
        replace_snapshot: optional(replaceSnapshot),
        uninstall_code: optional(uninstallCode),
        sender_canister_version: [],
      }),
      effectivePrincipal: { canisterId },
    });

    return canisterSnapshotFromIDL(
      decodeTakeCanisterSnapshotResponse(res.body),
    );
  }

  /**
   * Restores the given canister from one of its snapshots,
   * see {@link takeCanisterSnapshot}.
   *
   * @param options Options for loading the snapshot, see {@link CanisterSnapshotOptions}.
   */
  public async loadCanisterSnapshot({
    canisterId,
    snapshotId,
    sender = Principal.anonymous(),
  }: CanisterSnapshotOptions): Promise<void> {
    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'load_canister_snapshot',
      payload: encodeLoadCanisterSnapshotRequest({
        canister_id: canisterId,
        snapshot_id: snapshotId,
        sender_canister_version: [],
      }),
      effectivePrincipal: { canisterId },
    });
  }

  /**
   * Lists the snapshots of the given canister.
   *
   * @param options Options for listing the snapshots, see {@link ListCanisterSnapshotsOptions}.
   * @returns The snapshots, see {@link CanisterSnapshot}.
   */
  public async listCanisterSnapshots({
    canisterId,
    sender = Principal.anonymous(),
  }: ListCanisterSnapshotsOptions): Promise<CanisterSnapshot[]> {
    const res = await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'list_canister_snapshots',
      payload: encodeListCanisterSnapshotsRequest({ canister_id: canisterId }),
      effectivePrincipal: { canisterId },
    });

    return decodeListCanisterSnapshotsResponse(res.body).map(
      canisterSnapshotFromIDL,
    );
  }

  /**
   * Deletes a snapshot of the given canister.
   *
   * @param options Options for deleting the snapshot, see {@link CanisterSnapshotOptions}.
   */
  public async deleteCanisterSnapshot({
    canisterId,
    snapshotId,
    sender = Principal.anonymous(),
  }: CanisterSnapshotOptions): Promise<void> {
    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'delete_canister_snapshot',
      payload: encodeDeleteCanisterSnapshotRequest({
        canister_id: canisterId,
        snapshot_id: snapshotId,
      }),
      effectivePrincipal: { canisterId },
    });
  }

  /**
   * Downloads a snapshot of the given canister to a directory on the machine
   * running the PocketIC server, e.g. to reuse a canister's state across test runs.
   * Upload it again with {@link uploadCanisterSnapshot}.
   *
   * @param options Options for downloading the snapshot, see {@link DownloadCanisterSnapshotOptions}.
   */
  public async downloadCanisterSnapshot({
    canisterId,
    snapshotId,
    snapshotDir,
    sender = Principal.anonymous(),
  }: DownloadCanisterSnapshotOptions): Promise<void> {
    await this.client.canisterSnapshotDownload({
      sender,
      canisterId,
      snapshotId,
      snapshotDir,
    });
  }

  /**
   * Uploads a snapshot to the given canister from a directory on the machine
   * running the PocketIC server, as written by {@link downloadCanisterSnapshot}.
   * Restore the canister from it with {@link loadCanisterSnapshot}.
   *
   * @param options Options for uploading the snapshot, see {@link UploadCanisterSnapshotOptions}.
   * @returns The ID of the uploaded snapshot.
   */
  public async uploadCanisterSnapshot({
    canisterId,
    snapshotDir,
    replaceSnapshot,
    sender = Principal.anonymous(),
  }: UploadCanisterSnapshotOptions): Promise<Uint8Array> {
    return await this.client.canisterSnapshotUpload({
      sender,
      canisterId,
      replaceSnapshot,
      snapshotDir,
    });
  }

  /**
   * Creates an {@link Actor} for the given canister.
   * An {@link Actor} is a typesafe class that implements the Candid interface of a canister.
   * To create a canister for the {@link Actor}, see {@link createCanister}.
   * For a more convenient way of creating a PocketIC instance,
   * creating a canister and installing code, see {@link setupCanister}.
   *
   * @param options Options for creating the {@link Actor}, see {@link CreateActorOptions}.
   * @typeParam T The type of the {@link Actor}. Must implement {@link ActorInterface}.
   * @returns The {@link Actor} instance.
   *
   * @example
   * ```ts
   * import { resolve } from 'node:path';
   * import { PocketIc, PocketIcServer, generateRandomIdentity } from '@dfinity/pic';
   * import { _SERVICE, idlFactory } from '../declarations/backend.did';
   *
   * const wasm = resolve('..', '..', 'canister.wasm');
   * const alice = generateRandomIdentity();
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const canisterId = await pic.createCanister();
   * await pic.installCode({ canisterId, wasm });
   * const actor = pic.createActor<_SERVICE>({
   *   idlFactory,
   *   canisterId,
   *   sender: alice.getPrincipal(),
   * });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public createActor<T extends ActorInterface<T> = ActorInterface>({
    idlFactory,
    canisterId,
    sender,
  }: CreateActorOptions): Actor<T> {
    const Actor = createActorClass<T>(idlFactory, canisterId, this.client);
    const actor = new Actor();

    if (sender) {
      actor.setPrincipal(sender);
    }

    return actor;
  }

  /**
   * Creates a {@link DeferredActor} for the given canister.
   * A {@link DeferredActor} is a typesafe class that implements the Candid interface of a canister.
   *
   * A {@link DeferredActor} in contrast to a normal {@link Actor} will submit the call to the PocketIc replica,
   * but the call will not be executed immediately. Instead, the calls are queued and a `Promise` is returned
   * by the {@link DeferredActor} that can be awaited to process the pending canister call.
   *
   * To create a canister for the {@link DeferredActor}, see {@link createCanister}.
   * For a more convenient way of creating a PocketIC instance,
   * creating a canister and installing code, see {@link setupCanister}.
   *
   * @param options Options for creating the {@link DeferredActor}, see {@link CreateActorOptions}.
   * @typeParam T The type of the {@link DeferredActor}. Must implement {@link ActorInterface}.
   * @returns The {@link DeferredActor} instance.
   *
   * @example
   * ```ts
   * const deferredActor = pic.createDeferredActor<_SERVICE>({
   *   idlFactory,
   *   canisterId,
   * });
   *
   * const executeCall = await deferredActor.greet('PicJS');
   * // other calls or ticks...
   * const response = await executeCall();
   * ```
   */
  public createDeferredActor<T extends ActorInterface<T> = ActorInterface>({
    idlFactory,
    canisterId,
    sender,
  }: CreateActorOptions): DeferredActor<T> {
    const DeferredActor = createDeferredActorClass<T>(
      idlFactory,
      canisterId,
      this.client,
    );
    const deferredActor = new DeferredActor();

    if (sender) {
      deferredActor.setPrincipal(sender);
    }

    return deferredActor;
  }

  /**
   * Makes a query call to the given canister.
   *
   * @param options Options for making the query call, see {@link QueryCallOptions}.
   * @returns The Candid-encoded response of the query call.
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   * import { _SERVICE, idlFactory } from '../declarations';
   *
   * const wasm = resolve('..', '..', 'canister.wasm');
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * canisterId = await pic.createCanister({
   *   sender: controllerIdentity.getPrincipal(),
   * });
   * await pic.installCode({ canisterId, wasm });
   *
   * const res = await pic.queryCall({
   *  canisterId,
   *  method: 'greet',
   * });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async queryCall({
    canisterId,
    method,
    arg = new Uint8Array(),
    sender = Principal.anonymous(),
    targetSubnetId,
    senderInfo,
  }: QueryCallOptions): Promise<Uint8Array> {
    const res = await this.client.queryCall({
      canisterId,
      method,
      payload: new Uint8Array(arg),
      sender,
      effectivePrincipal: targetSubnetId
        ? {
            subnetId: targetSubnetId,
          }
        : undefined,
      senderInfo,
    });

    return res.body;
  }

  /**
   * Fetches the log records of the given canister, e.g. to inspect traps in
   * timers or heartbeats. Only controllers can read a canister's logs unless
   * its log visibility allows otherwise, see {@link FetchCanisterLogsOptions.sender}.
   *
   * @param options Options for fetching canister logs, see {@link FetchCanisterLogsOptions}.
   * @returns The canister's log records, see {@link CanisterLogRecord}.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer, generateRandomIdentity } from '@dfinity/pic';
   *
   * const controller = generateRandomIdentity();
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const canisterId = await pic.createCanister({
   *   sender: controller.getPrincipal(),
   *   controllers: [controller.getPrincipal()],
   * });
   * // install and call the canister...
   *
   * const logs = await pic.fetchCanisterLogs({
   *   canisterId,
   *   sender: controller.getPrincipal(),
   * });
   * const messages = logs.map(log => new TextDecoder().decode(log.content));
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async fetchCanisterLogs({
    canisterId,
    sender,
    filter,
  }: FetchCanisterLogsOptions): Promise<CanisterLogRecord[]> {
    const payload = encodeFetchCanisterLogsRequest({
      canister_id: canisterId,
      filter: optCanisterLogFilterToIDL(filter),
    });

    const res = await this.client.queryCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'fetch_canister_logs',
      payload,
      effectivePrincipal: { canisterId },
    });

    const decoded = decodeFetchCanisterLogsResponse(res.body);

    return decoded.canister_log_records.map(record => ({
      idx: record.idx,
      timestampNanos: record.timestamp_nanos,
      content: new Uint8Array(record.content),
    }));
  }

  /**
   * Makes an update call to the given canister.
   *
   * @param options Options for making the update call, see {@link UpdateCallOptions}.
   * @returns The Candid-encoded response of the update call.
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   * import { _SERVICE, idlFactory } from '../declarations';
   *
   * const wasm = resolve('..', '..', 'canister.wasm');
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * canisterId = await pic.createCanister({
   *   sender: controllerIdentity.getPrincipal(),
   * });
   * await pic.installCode({ canisterId, wasm });
   *
   * const res = await pic.updateCall({
   *  canisterId,
   *  method: 'greet',
   * });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async updateCall({
    canisterId,
    method,
    arg = new Uint8Array(),
    sender = Principal.anonymous(),
    targetSubnetId,
    senderInfo,
  }: UpdateCallOptions): Promise<Uint8Array> {
    const res = await this.client.updateCall({
      canisterId,
      method,
      payload: new Uint8Array(arg),
      sender,
      effectivePrincipal: targetSubnetId
        ? {
            subnetId: targetSubnetId,
          }
        : undefined,
      senderInfo,
    });

    return res.body;
  }

  /**
   * Submits an update call to the given canister without executing it.
   * The call is executed by later rounds, e.g. from {@link tick}, and its result is
   * fetched with {@link awaitCall} or {@link ingressStatus}.
   *
   * @param options Options for submitting the update call, see {@link UpdateCallOptions}.
   * @returns The submitted call, see {@link SubmittedCall}.
   *
   * @example
   * ```ts
   * const call = await pic.submitCall({ canisterId, method: 'greet' });
   *
   * await pic.ingressStatus(call); // null, the call has not been executed yet
   * await pic.tick();
   * const res = await pic.ingressStatus(call); // the Candid-encoded response
   * ```
   */
  public async submitCall({
    canisterId,
    method,
    arg = new Uint8Array(),
    sender = Principal.anonymous(),
    targetSubnetId,
    senderInfo,
  }: UpdateCallOptions): Promise<SubmittedCall> {
    return await this.client.submitCall({
      canisterId,
      method,
      payload: new Uint8Array(arg),
      sender,
      effectivePrincipal: targetSubnetId
        ? {
            subnetId: targetSubnetId,
          }
        : undefined,
      senderInfo,
    });
  }

  /**
   * Executes rounds until the given call has finished, see {@link submitCall}.
   *
   * @param call The submitted call, see {@link SubmittedCall}.
   * @returns The Candid-encoded response of the update call.
   * Throws if the call was rejected.
   */
  public async awaitCall(call: SubmittedCall): Promise<Uint8Array> {
    const res = await this.client.awaitCall(call);

    return res.body;
  }

  /**
   * Fetches the status of the given call without executing any rounds,
   * see {@link submitCall}.
   *
   * @param call The submitted call, see {@link SubmittedCall}.
   * @param options Options for fetching the status, see {@link IngressStatusOptions}.
   * @returns The Candid-encoded response of the update call if it has finished,
   * `null` otherwise. Throws if the call was rejected.
   */
  public async ingressStatus(
    call: SubmittedCall,
    { caller }: IngressStatusOptions = {},
  ): Promise<Uint8Array | null> {
    const res = await this.client.ingressStatus({ call, caller });

    return res?.body ?? null;
  }

  /**
   * Deletes the PocketIC instance.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async tearDown(): Promise<void> {
    await this.client.deleteInstance();
  }

  /**
   * Make the IC produce and progress by one block. Accepts a parameter `times` to tick multiple times,
   * the default is `1`.
   *
   * @param times The number of new blocks to produce and progress by. Defaults to `1`.
   *
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.tick();
   *
   * // or to tick multiple times
   * await pic.tick(3);
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async tick(times: number = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.client.tick();
    }
  }

  /**
   * Get the controllers of the specified canister.
   *
   * @param canisterId The Principal of the canister to get the controllers of.
   * @returns The controllers of the specified canister.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const controllers = await pic.getControllers(canisterId);
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async getControllers(canisterId: Principal): Promise<Principal[]> {
    return await this.client.getControllers({ canisterId });
  }

  /**
   * Get the current time of the IC in milliseconds since the Unix epoch.
   *
   * @returns The current time in milliseconds since the UNIX epoch.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const time = await pic.getTime();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async getTime(): Promise<number> {
    const { nanosSinceEpoch } = await this.client.getTime();

    return Number(nanosSinceEpoch / NANOS_PER_MILLISECOND);
  }

  /**
   * Reset the time of the IC to the current time.
   * {@link tick} should be called after calling this method in order for query calls
   * and read state request to reflect the new time.
   *
   * Use {@link resetCertifiedTime} to set time and immediately have query calls and
   * read state requests reflect the new time.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.resetTime();
   * await pic.tick();
   *
   * const time = await pic.getTime();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async resetTime(): Promise<void> {
    await this.setTime(Date.now());
  }

  /**
   * Reset the time of the IC to the current time and immediately have query calls and
   * read state requests reflect the new time.
   *
   * Use {@link resetTime} to reset time without immediately reflecting the new time.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.resetCertifiedTime();
   *
   * const time = await pic.getTime();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async resetCertifiedTime(): Promise<void> {
    await this.setCertifiedTime(Date.now());
  }

  /**
   * Set the current time of the IC.
   * {@link tick} should be called after calling this method in order for query calls
   * and read state request to reflect the new time.
   *
   * Use {@link setCertifiedTime} to set time and immediately have query calls and
   * read state requests reflect the new time.
   *
   * @param time The time to set in milliseconds since the Unix epoch.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const pic = await PocketIc.create();
   *
   * const date = new Date();
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.setTime(date);
   * // or
   * await pic.setTime(date.getTime());
   *
   * await pic.tick();
   *
   * const time = await pic.getTime();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async setTime(time: Date | number): Promise<void> {
    if (time instanceof Date) {
      time = time.getTime();
    }

    await this.client.setTime({ millisSinceEpoch: time });
  }

  /**
   * Set the current time of the IC and immediately have query calls and
   * read state requests reflect the new time.
   *
   * Use {@link setTime} to set time without immediately reflecting the new time.
   *
   * @param time The time to set in milliseconds since the Unix epoch.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const pic = await PocketIc.create();
   *
   * const date = new Date();
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.setCertifiedTime(date);
   * // or
   * await pic.setCertifiedTime(date.getTime());
   *
   * const time = await pic.getTime();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async setCertifiedTime(time: Date | number): Promise<void> {
    if (time instanceof Date) {
      time = time.getTime();
    }

    await this.client.setCertifiedTime({ millisSinceEpoch: time });
  }

  /**
   * Advance the time of the IC by the given duration in milliseconds.
   * {@link tick} should be called after calling this method in order for query calls
   * and read state requests to reflect the new time.
   *
   * Use {@link advanceCertifiedTime} to advance time and immediately have query calls and
   * read state requests reflect the new time.
   *
   * @param duration The duration to advance the time by.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const initialTime = await pic.getTime();
   * await pic.advanceTime(1_000);
   * await pic.tick();
   *
   * const newTime = await pic.getTime();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async advanceTime(duration: number): Promise<void> {
    const { nanosSinceEpoch } = await this.client.getTime();
    const durationNanos = BigInt(duration) * NANOS_PER_MILLISECOND;
    const newTimeNanos = nanosSinceEpoch + durationNanos;
    await this.client.setTime({ nanosSinceEpoch: newTimeNanos });
  }

  /**
   * Advance the time of the IC by the given duration in milliseconds and
   * immediately have query calls and read state requests reflect the new time.
   *
   * Use {@link advanceTime} to advance time without immediately reflecting the new time.
   *
   * @param duration The duration to advance the time by.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const initialTime = await pic.getTime();
   * await pic.advanceCertifiedTime(1_000);
   *
   * const newTime = await pic.getTime();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async advanceCertifiedTime(duration: number): Promise<void> {
    const { nanosSinceEpoch } = await this.client.getTime();
    const durationNanos = BigInt(duration) * NANOS_PER_MILLISECOND;
    const newTimeNanos = nanosSinceEpoch + durationNanos;
    await this.client.setCertifiedTime({ nanosSinceEpoch: newTimeNanos });
  }

  /**
   * Fetch the public key of the specified subnet.
   *
   * @param subnetId The Principal of the subnet to fetch the public key of.
   * @returns The public key of the specified subnet.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const subnets = pic.getApplicationSubnets();
   * const pubKey = await pic.getPubKey(subnets[0].id);
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async getPubKey(subnetId: Principal): Promise<Uint8Array> {
    return await this.client.getPubKey({ subnetId });
  }

  /**
   * Verifies a canister signature, as issued by canisters like Internet Identity.
   *
   * @param options Options for verifying the signature, see {@link VerifyCanisterSignatureOptions}.
   * Throws if the signature is invalid.
   *
   * @example
   * ```ts
   * const nnsSubnet = await pic.getNnsSubnet();
   * const rootKey = await pic.getPubKey(nnsSubnet.id);
   *
   * await pic.verifyCanisterSignature({
   *   message,
   *   signature,
   *   publicKey,
   *   rootKey,
   * });
   * ```
   */
  public async verifyCanisterSignature(
    options: VerifyCanisterSignatureOptions,
  ): Promise<void> {
    await this.client.verifyCanisterSignature(options);
  }

  /**
   * Gets the subnet Id of the provided canister Id.
   *
   * @param canisterId The Principal of the canister to get the subnet Id of.
   * @returns The canister's subnet Id if the canister exists, `null` otherwise.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const subnetId = await pic.getCanisterSubnetId(canisterId);
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async getCanisterSubnetId(
    canisterId: Principal,
  ): Promise<Principal | null> {
    const { subnetId } = await this.client.getSubnetId({ canisterId });

    return subnetId;
  }

  /**
   * Checks whether the given canister exists.
   *
   * @param canisterId The Principal of the canister to check.
   * @returns `true` if the canister exists, `false` otherwise.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   */
  public async canisterExists(canisterId: Principal): Promise<boolean> {
    return (await this.getCanisterSubnetId(canisterId)) !== null;
  }

  /**
   * Get the topology of this instance's network.
   * The topology is a list of subnets, each with a type and a list of canister ID ranges
   * that can be deployed to that subnet.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns An array of subnet topologies, see {@link SubnetTopology}.
   */
  public async getTopology(): Promise<SubnetTopology[]> {
    const topology = await this.client.getTopology();

    return Object.values(topology);
  }

  /**
   * Get the default effective canister id for this PocketIC instance.
   * This is useful when calling [`IcManagementCanister.provisionalCreateCanisterWithCycles`](https://js.icp.build/canisters/latest/api/ic-management/#provisionalcreatecanisterwithcycles)
   * on the management canister from `@icp-sdk/canisters/ic-management`.
   *
   * @returns The default effective canister id.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   * import { IcManagementCanister } from '@icp-sdk/canisters/ic-management';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const defaultEffectiveCanisterId = await pic.getDefaultEffectiveCanisterId();
   *
   * const managementCanister = IcManagementCanister.create({ agent });
   * const canisterId = await managementCanister.provisionalCreateCanisterWithCycles({
   *   canisterId: defaultEffectiveCanisterId,
   * });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async getDefaultEffectiveCanisterId(): Promise<Principal> {
    return await this.client.getDefaultEffectiveCanisterId();
  }

  /**
   * Get the Bitcoin subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the Bitcoin subnet,
   * if it exists on this instance's network.
   */
  public async getBitcoinSubnet(): Promise<SubnetTopology | undefined> {
    const topology = await this.getTopology();

    return topology.find(subnet => subnet.type === SubnetType.Bitcoin);
  }

  /**
   * Get the Fiduciary subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the Fiduciary subnet,
   * if it exists on this instance's network.
   */
  public async getFiduciarySubnet(): Promise<SubnetTopology | undefined> {
    const topology = await this.getTopology();

    return topology.find(subnet => subnet.type === SubnetType.Fiduciary);
  }

  /**
   * Get the test threshold keys subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the test threshold keys subnet,
   * if it exists on this instance's network.
   */
  public async getTestThresholdKeysSubnet(): Promise<
    SubnetTopology | undefined
  > {
    const topology = await this.getTopology();

    return topology.find(
      subnet => subnet.type === SubnetType.TestThresholdKeys,
    );
  }

  /**
   * Get the Internet Identity subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the Internet Identity subnet,
   * if it exists on this instance's network.
   */
  public async getInternetIdentitySubnet(): Promise<
    SubnetTopology | undefined
  > {
    const topology = await this.getTopology();

    return topology.find(subnet => subnet.type === SubnetType.InternetIdentity);
  }

  /**
   * Get the NNS subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the NNS subnet,
   * if it exists on this instance's network.
   */
  public async getNnsSubnet(): Promise<SubnetTopology | undefined> {
    const topology = await this.getTopology();

    return topology.find(subnet => subnet.type === SubnetType.NNS);
  }

  /**
   * Get the SNS subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the SNS subnet,
   * if it exists on this instance's network.
   */
  public async getSnsSubnet(): Promise<SubnetTopology | undefined> {
    const topology = await this.getTopology();

    return topology.find(subnet => subnet.type === SubnetType.SNS);
  }

  /**
   * Get all application subnet topologies for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns An array of subnet topologies for each application subnet
   * that exists on this instance's network.
   */
  public async getApplicationSubnets(): Promise<SubnetTopology[]> {
    const topology = await this.getTopology();

    return topology.filter(subnet => subnet.type === SubnetType.Application);
  }

  /**
   * Get all system subnet topologies for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns An array of subnet topologies for each system subnet
   * that exists on this instance's network.
   */
  public async getSystemSubnets(): Promise<SubnetTopology[]> {
    const topology = await this.getTopology();

    return topology.filter(subnet => subnet.type === SubnetType.System);
  }

  /**
   * Gets the current cycle balance of the specified canister.
   *
   * @param canisterId The Principal of the canister to check.
   * @returns The current cycles balance of the canister.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const cyclesBalance = await pic.getCyclesBalance(canisterId);
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async getCyclesBalance(canisterId: Principal): Promise<bigint> {
    const { cycles } = await this.client.getCyclesBalance({ canisterId });

    return cycles;
  }

  /**
   * Add cycles to the specified canister.
   *
   * @param canisterId The Principal of the canister to add cycles to.
   * @param amount The amount of cycles to add.
   * @returns The new cycle balance of the canister.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const newCyclesBalance = await pic.addCycles(canisterId, BigInt(10_000_000));
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async addCycles(
    canisterId: Principal,
    amount: bigint,
  ): Promise<bigint> {
    const { cycles } = await this.client.addCycles({ canisterId, amount });

    return cycles;
  }

  /**
   * Set the stable memory of a given canister.
   *
   * @param canisterId The Principal of the canister to set the stable memory of.
   * @param stableMemory A blob containing the stable memory to set.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   * const stableMemory = new Uint8Array([0, 1, 2, 3, 4]);
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.setStableMemory(canisterId, stableMemory);
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async setStableMemory(
    canisterId: Principal,
    stableMemory: Uint8Array,
  ): Promise<void> {
    const { blobId } = await this.client.uploadBlob({
      blob: new Uint8Array(stableMemory),
    });

    await this.client.setStableMemory({ canisterId, blobId });
  }

  /**
   * Get the stable memory of a given canister.
   *
   * @param canisterId The Principal of the canister to get the stable memory of.
   * @returns A blob containing the canister's stable memory.
   *
   * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/#principal)
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const stableMemory = await pic.getStableMemory(canisterId);
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async getStableMemory(canisterId: Principal): Promise<Uint8Array> {
    const { blob } = await this.client.getStableMemory({ canisterId });

    return blob;
  }

  /**
   * Get all pending HTTPS Outcalls across all subnets on this
   * PocketIC instance.
   *
   * @returns An array of pending HTTPS Outcalls.
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * // queue the canister message that will send the HTTPS Outcall
   * const executeGoogleSearch = await deferredActor.google_search();
   *
   * // tick for two rounds to allow the canister message to be processed
   * // and for the HTTPS Outcall to be queued
   * await pic.tick(2);
   *
   * // get all queued HTTPS Outcalls
   * const pendingHttpsOutcalls = await pic.getPendingHttpsOutcalls();
   *
   * // get the first pending HTTPS Outcall
   * const pendingGoogleSearchOutcall = pendingHttpsOutcalls[0];
   *
   * // mock the HTTPS Outcall
   * await pic.mockPendingHttpsOutcall({
   *   requestId: pendingGoogleSearchOutcall.requestId,
   *   subnetId: pendingGoogleSearchOutcall.subnetId,
   *   response: {
   *     type: 'success',
   *     body: new TextEncoder().encode('Google search result'),
   *     statusCode: 200,
   *     headers: [],
   *   },
   * });
   *
   * // finish executing the message, including the HTTPS Outcall
   * const result = await executeGoogleSearch();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async getPendingHttpsOutcalls(): Promise<PendingHttpsOutcall[]> {
    return await this.client.getPendingHttpsOutcalls();
  }

  /**
   * Mock a pending HTTPS Outcall.
   *
   * @param options Options for mocking the pending HTTPS Outcall, see {@link MockPendingHttpsOutcallOptions}.
   *
   * @example
   * ```ts
   * import { Principal } from '@icp-sdk/core/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * // queue the canister message that will send the HTTPS Outcall
   * const executeGoogleSearch = await deferredActor.google_search();
   *
   * // tick for two rounds to allow the canister message to be processed
   * // and for the HTTPS Outcall to be queued
   * await pic.tick(2);
   *
   * // get all queued HTTPS Outcalls
   * const pendingHttpsOutcalls = await pic.getPendingHttpsOutcalls();
   *
   * // get the first pending HTTPS Outcall
   * const pendingGoogleSearchOutcall = pendingHttpsOutcalls[0];
   *
   * // mock the HTTPS Outcall
   * await pic.mockPendingHttpsOutcall({
   *   requestId: pendingGoogleSearchOutcall.requestId,
   *   subnetId: pendingGoogleSearchOutcall.subnetId,
   *   response: {
   *     type: 'success',
   *     body: new TextEncoder().encode('Google search result'),
   *     statusCode: 200,
   *     headers: [],
   *   },
   * });
   *
   * // finish executing the message, including the HTTPS Outcall
   * const result = await executeGoogleSearch();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async mockPendingHttpsOutcall({
    requestId,
    response,
    subnetId,
    additionalResponses = [],
  }: MockPendingHttpsOutcallOptions): Promise<void> {
    return await this.client.mockPendingHttpsOutcall({
      requestId,
      response,
      subnetId,
      additionalResponses,
    });
  }

  /**
   * Make the PocketIC instance live by enabling auto progress and starting an HTTP gateway.
   * If the instance was created with {@link CreateInstanceOptions.httpGateway}, that gateway is used instead.
   * If the instance is already live, this method returns the port of its HTTP gateway,
   * starting one first if the instance was created live with {@link CreateInstanceOptions.autoProgress}.
   *
   * @param options Options for making the instance live, see {@link MakeLiveOptions}.
   * To change them on a live instance, call {@link stopLive} first.
   * @returns The HTTP Gateway port.
   *
   * @example
   * ```ts
   * import { Actor, HttpAgent } from '@icp-sdk/core/agent';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   * import { resolve } from 'node:path';
   * import { idlFactory } from '../declarations';
   *
   * const wasm = resolve('..', '..', 'canister.wasm');
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   * const { canisterId } = await pic.setupCanister({ idlFactory, wasm });
   *
   * const httpGatewayPort = await pic.makeLive({ artificialDelayMs: 500 });
   * const agent = await HttpAgent.create({
   *   host: `http://localhost:${httpGatewayPort}`,
   *   shouldFetchRootKey: true,
   * });
   * const actor = Actor.createActor(idlFactory, { agent, canisterId });
   *
   * await pic.stopLive();
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async makeLive({
    artificialDelayMs,
    httpGateway,
  }: MakeLiveOptions = {}): Promise<number> {
    if (!isNil(httpGateway) && !isNil(this.client.instanceHttpGatewayPort)) {
      throw new Error(
        'The instance was created with an HTTP gateway, configure it with the httpGateway option of PocketIc.create instead',
      );
    }

    const isLive = await this.client.autoProgressEnabled();
    if (isLive) {
      const hasGateway = !isNil(this.httpGatewayPort);
      if (!isNil(artificialDelayMs) || (hasGateway && !isNil(httpGateway))) {
        throw new Error(
          'The instance is already live, call stopLive before making it live with new options',
        );
      }

      // An instance created with CreateInstanceOptions.autoProgress is live
      // before it has an HTTP gateway.
      if (isNil(this.httpGatewayPort)) {
        this.httpGatewayPort =
          this.client.instanceHttpGatewayPort ??
          (await this.client.startHttpGateway(httpGateway));
      }

      return this.httpGatewayPort;
    }

    await this.client.autoProgress(artificialDelayMs);
    try {
      this.httpGatewayPort =
        this.client.instanceHttpGatewayPort ??
        (await this.client.startHttpGateway(httpGateway));
    } catch (error) {
      await this.client.stopProgress();
      throw error;
    }

    return this.httpGatewayPort;
  }

  /**
   * Disables auto progress and stops the HTTP gateway started by {@link makeLive}.
   * A gateway created with {@link CreateInstanceOptions.httpGateway} keeps running until the instance is torn down.
   *
   * @example
   * ```ts
   * const httpGatewayPort = await pic.makeLive();
   * // make calls through the HTTP gateway...
   *
   * await pic.stopLive();
   * ```
   */
  public async stopLive(): Promise<void> {
    this.httpGatewayPort = null;

    await this.client.stopHttpGateway();
    await this.client.stopProgress();
  }

  private async installCodeChunked({
    wasm,
    arg,
    canisterId,
    mode,
    sender,
    targetSubnetId,
  }: {
    wasm: Uint8Array;
    arg: Uint8Array;
    canisterId: Principal;
    mode: CanisterInstallMode;
    sender: Principal;
    targetSubnetId?: Principal;
  }): Promise<void> {
    const effectivePrincipal = targetSubnetId
      ? { subnetId: targetSubnetId }
      : { canisterId };

    const clearChunkStoreRequestPayload = encodeClearChunkStoreRequest({
      canister_id: canisterId,
    });

    // 1. Clear existing chunk store
    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'clear_chunk_store',
      payload: clearChunkStoreRequestPayload,
      effectivePrincipal,
    });

    // 2. Split WASM into chunks and upload in parallel batches
    const chunks = splitIntoChunks(wasm, WASM_CHUNK_SIZE);
    const chunkHashes: ChunkHash[] = [];

    for (let i = 0; i < chunks.length; i += CHUNK_UPLOAD_BATCH_SIZE) {
      const batch = chunks.slice(i, i + CHUNK_UPLOAD_BATCH_SIZE);

      const chunkHashResponses = await Promise.all(
        batch.map(async chunk => {
          const uploadChunkRequestPayload = encodeUploadChunkRequest({
            canister_id: canisterId,
            chunk,
          });
          const response = await this.client.updateCall({
            canisterId: MANAGEMENT_CANISTER_ID,
            sender,
            method: 'upload_chunk',
            payload: uploadChunkRequestPayload,
            effectivePrincipal,
          });

          return decodeUploadChunkResponse(response.body);
        }),
      );

      chunkHashes.push(...chunkHashResponses);
    }

    // 3. Install the chunked code
    const installChunkedCodePayload = encodeInstallChunkedCodeRequest({
      mode,
      target_canister: canisterId,
      store_canister: [],
      chunk_hashes_list: chunkHashes,
      wasm_module_hash: sha256(wasm),
      arg,
      sender_canister_version: [],
    });

    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'install_chunked_code',
      payload: installChunkedCodePayload,
      effectivePrincipal,
    });
  }
}
