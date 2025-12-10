import { Principal } from '@dfinity/principal';
import { PocketIc } from '../../src';

describe('getDefaultEffectiveCanisterId', () => {
  let pic: PocketIc;

  beforeEach(async () => {
    pic = await PocketIc.create(process.env.PIC_URL);
  });

  afterEach(async () => {
    await pic.tearDown();
  });

  it('should return a Principal', async () => {
    const defaultEffectiveCanisterId =
      await pic.getDefaultEffectiveCanisterId();

    expect(defaultEffectiveCanisterId).toBeInstanceOf(Principal);
  });

  it('should return a canister id within a subnet canister range', async () => {
    const defaultEffectiveCanisterId =
      await pic.getDefaultEffectiveCanisterId();
    const topology = await pic.getTopology();

    const isWithinRange = topology.some(subnet =>
      subnet.canisterRanges.some(
        range =>
          defaultEffectiveCanisterId.gtEq(range.start) &&
          defaultEffectiveCanisterId.ltEq(range.end),
      ),
    );

    expect(isWithinRange).toBe(true);
  });

  it('should return a consistent canister id across multiple calls', async () => {
    const firstCall = await pic.getDefaultEffectiveCanisterId();
    const secondCall = await pic.getDefaultEffectiveCanisterId();

    expect(firstCall.toText()).toEqual(secondCall.toText());
  });
});
