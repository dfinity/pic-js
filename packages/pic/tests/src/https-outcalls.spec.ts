import { CanisterHttpMethod } from '../../src';
import {
  HttpMethod,
  _SERVICE as TestCanister,
  idlFactory,
} from '../test-canister/declarations/test_canister.did';
import { TestFixture } from './util';

describe('getPendingHttpsOutcalls', () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await TestFixture.create();
  });

  afterEach(async () => {
    await fixture.tearDown();
  });

  // PocketIC 14, which this release line pins, makes no PATCH outcalls.
  it.each<[HttpMethod, CanisterHttpMethod]>([
    [{ get: null }, CanisterHttpMethod.GET],
    [{ head: null }, CanisterHttpMethod.HEAD],
    [{ post: null }, CanisterHttpMethod.POST],
    [{ put: null }, CanisterHttpMethod.PUT],
    [{ delete: null }, CanisterHttpMethod.DELETE],
  ])(
    'should read and answer an outcall made with %o',
    async (method, expected) => {
      const actor = fixture.pic.createDeferredActor<TestCanister>(
        idlFactory,
        fixture.canisterId,
      );
      const executeRequest = await actor.http_request_status(method);
      await fixture.pic.tick(2);

      const [outcall] = await fixture.pic.getPendingHttpsOutcalls();
      expect(outcall.httpMethod).toBe(expected);

      await fixture.pic.mockPendingHttpsOutcall({
        requestId: outcall.requestId,
        subnetId: outcall.subnetId,
        response: {
          type: 'success',
          body: new Uint8Array(),
          statusCode: 204,
          headers: [],
        },
      });

      expect(await executeRequest()).toBe(204n);
    },
  );
});
