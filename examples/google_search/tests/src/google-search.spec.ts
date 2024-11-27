import { resolve } from 'node:path';
import { Principal } from '@dfinity/principal';
import { PocketIc, DeferredActor } from '@hadronous/pic';

import { _SERVICE, idlFactory } from '../../declarations/google_search.did';

const WASM_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.dfx',
  'local',
  'canisters',
  'google_search',
  'google_search.wasm.gz',
);

describe('GoogleSearch', () => {
  let deferredActor: DeferredActor<_SERVICE>;
  let pic: PocketIc;
  let canisterId: Principal;

  beforeEach(async () => {
    pic = await PocketIc.create(process.env.PIC_URL);
    const fixture = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: WASM_PATH,
    });
    canisterId = fixture.canisterId;
    deferredActor = pic.createDeferredActor(idlFactory, canisterId);
  });

  afterEach(async () => {
    await pic.tearDown();
  });

  it('should make a Google search', async () => {
    const executeGoogleSearch = await deferredActor.google_search();
    await pic.tick(2);

    const pendingHttpsOutcalls = await pic.getPendingHttpsOutcalls();
    const pendingGoogleSearchOutcall = pendingHttpsOutcalls[0];

    await pic.mockPendingHttpsOutcall({
      requestId: pendingGoogleSearchOutcall.requestId,
      subnetId: pendingGoogleSearchOutcall.subnetId,
      response: {
        type: 'success',
        body: new TextEncoder().encode('Google search result'),
        statusCode: 200,
        headers: [],
      },
    });

    const result = await executeGoogleSearch();
    expect(result).toBe('Google search result');
  });
});
