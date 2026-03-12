import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { PocketIc, generateRandomIdentity } from '../../src';
import { sha256 } from '../../src/util/wasm';
import {
  _SERVICE as TestCanister,
  idlFactory,
} from '../test-canister/declarations/test_canister.did';

const WASM_PATH = path.resolve(
  __dirname,
  '..',
  'test-canister',
  'test_canister.wasm.gz',
);

const CONTROLLER = generateRandomIdentity();
const CONTROLLER_PRINCIPAL = CONTROLLER.getPrincipal();
const OTHER_PRINCIPAL = generateRandomIdentity().getPrincipal();

/**
 * Pads a WASM module to the target size by appending a custom section.
 * Custom sections (id 0x00) are ignored by the WASM runtime, so the
 * canister still behaves normally.
 */
function padWasm(wasm: Uint8Array, targetSize: number): Uint8Array {
  const paddingSize = targetSize - wasm.byteLength;
  if (paddingSize <= 0) return wasm;

  // Custom section: id (1 byte) + size as fixed u32 LEB128 (5 bytes) +
  //                 name length (1 byte) + name "p" (1 byte) + content
  const contentSize = paddingSize - 8;
  const section = new Uint8Array(paddingSize);
  section[0] = 0x00; // custom section id
  // Encode content size + 2 (name length + name) as 5-byte LEB128
  let size = contentSize + 2;
  for (let i = 1; i <= 5; i++) {
    section[i] = (size & 0x7f) | (i < 5 ? 0x80 : 0);
    size >>>= 7;
  }
  section[6] = 0x01; // name length
  section[7] = 0x70; // name "p"
  // Fill with a non-uniform pattern so each chunk has unique content,
  // ensuring that reordering chunks would produce a different hash.
  for (let i = 8; i < paddingSize; i++) {
    section[i] = (i * 137 + 43) & 0xff;
  }

  const result = new Uint8Array(targetSize);
  result.set(wasm);
  result.set(section, wasm.byteLength);
  return result;
}

function loadWasm(targetSize?: number): Uint8Array {
  const compressed = readFileSync(WASM_PATH);
  const decompressed = new Uint8Array(gunzipSync(compressed));

  if (targetSize === undefined) {
    return decompressed;
  }

  return padWasm(decompressed, targetSize);
}

// Small WASM uses the regular install_code path,
// large WASM (>2 MB) uses the chunked upload path.
const wasmVariants: [string, number | undefined][] = [
  ['small', undefined],
  ['large (chunked)', 2_500_000],
];

describe.each(wasmVariants)('PocketIc — %s WASM', (_label, targetSize) => {
  let pic: PocketIc;
  let wasm: Uint8Array;
  let expectedHash: Uint8Array;

  beforeAll(() => {
    wasm = loadWasm(targetSize);
    expectedHash = sha256(wasm);
  });

  beforeEach(async () => {
    pic = await PocketIc.create(process.env.PIC_URL);
  });

  afterEach(async () => {
    await pic.tearDown();
  });

  it('should install code via installCode', async () => {
    const canisterId = await pic.createCanister({
      sender: CONTROLLER_PRINCIPAL,
      controllers: [CONTROLLER_PRINCIPAL],
    });

    await pic.installCode({
      canisterId,
      wasm,
      sender: CONTROLLER_PRINCIPAL,
    });

    const actor = pic.createActor<TestCanister>(idlFactory, canisterId);
    const time = await actor.get_time();
    expect(time).toBeGreaterThan(0n);

    const status = await pic.canisterStatus({
      canisterId,
      sender: CONTROLLER_PRINCIPAL,
    });
    expect(status.status).toEqual({ running: null });
    expect(status.moduleHash).toEqual(expectedHash);
  });

  it('should reinstall code via reinstallCode', async () => {
    const canisterId = await pic.createCanister({
      sender: CONTROLLER_PRINCIPAL,
      controllers: [CONTROLLER_PRINCIPAL],
    });

    await pic.installCode({
      canisterId,
      wasm,
      sender: CONTROLLER_PRINCIPAL,
    });

    await pic.reinstallCode({
      canisterId,
      wasm,
      sender: CONTROLLER_PRINCIPAL,
    });

    const actor = pic.createActor<TestCanister>(idlFactory, canisterId);
    const time = await actor.get_time();
    expect(time).toBeGreaterThan(0n);

    const status = await pic.canisterStatus({
      canisterId,
      sender: CONTROLLER_PRINCIPAL,
    });
    expect(status.status).toEqual({ running: null });
    expect(status.moduleHash).toEqual(expectedHash);
  });

  it('should upgrade code via upgradeCanister', async () => {
    const canisterId = await pic.createCanister({
      sender: CONTROLLER_PRINCIPAL,
      controllers: [CONTROLLER_PRINCIPAL],
    });

    await pic.installCode({
      canisterId,
      wasm,
      sender: CONTROLLER_PRINCIPAL,
    });

    await pic.upgradeCanister({
      canisterId,
      wasm,
      sender: CONTROLLER_PRINCIPAL,
      upgradeModeOptions: {
        skip_pre_upgrade: [],
        wasm_memory_persistence: [{ replace: null }],
      },
    });

    const actor = pic.createActor<TestCanister>(idlFactory, canisterId);
    const time = await actor.get_time();
    expect(time).toBeGreaterThan(0n);

    const status = await pic.canisterStatus({
      canisterId,
      sender: CONTROLLER_PRINCIPAL,
    });
    expect(status.status).toEqual({ running: null });
    expect(status.moduleHash).toEqual(expectedHash);
  });

  it('should set up a canister via setupCanister', async () => {
    const fixture = await pic.setupCanister<TestCanister>({
      idlFactory,
      wasm,
      sender: CONTROLLER_PRINCIPAL,
      controllers: [CONTROLLER_PRINCIPAL],
    });

    expect(fixture.canisterId).toBeDefined();

    const time = await fixture.actor.get_time();
    expect(time).toBeGreaterThan(0n);

    const status = await pic.canisterStatus({
      canisterId: fixture.canisterId,
      sender: CONTROLLER_PRINCIPAL,
    });
    expect(status.status).toEqual({ running: null });
    expect(status.moduleHash).toEqual(expectedHash);
  });

  it('should update canister settings', async () => {
    const canisterId = await pic.createCanister({
      sender: CONTROLLER_PRINCIPAL,
      controllers: [CONTROLLER_PRINCIPAL],
    });

    const envVars = [
      { name: 'FOO', value: 'bar' },
      { name: 'BAZ', value: 'qux' },
    ];
    const wasmThreshold = 4_000_000n;

    let status = await pic.canisterStatus({
      canisterId,
      sender: CONTROLLER_PRINCIPAL,
    });
    expect(status.settings.controllers).toEqual([CONTROLLER_PRINCIPAL]);

    await pic.updateCanisterSettings({
      canisterId,
      controllers: [CONTROLLER_PRINCIPAL, OTHER_PRINCIPAL],
      logVisibility: { public: null },
      wasmMemoryThreshold: wasmThreshold,
      environmentVariables: envVars,
      sender: CONTROLLER_PRINCIPAL,
    });

    status = await pic.canisterStatus({
      canisterId,
      sender: CONTROLLER_PRINCIPAL,
    });
    expect(status.settings.controllers).toEqual(
      expect.arrayContaining([CONTROLLER_PRINCIPAL, OTHER_PRINCIPAL]),
    );
    expect(status.settings.controllers).toHaveLength(2);

    expect(status.settings.logVisibility).toEqual({ public: null });
    expect(status.settings.wasmMemoryThreshold).toEqual(wasmThreshold);

    expect(status.settings.environmentVariables).toEqual(
      expect.arrayContaining(envVars),
    );
    expect(status.settings.environmentVariables).toHaveLength(envVars.length);
  });
});
