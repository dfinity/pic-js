import { IDL } from '@icp-sdk/core/candid';
import { generateRandomIdentity } from '../../src';
import { CONTROLLER, TestFixture } from './util';

describe('canister lifecycle', () => {
  let fixture: TestFixture;
  const sender = CONTROLLER.getPrincipal();

  beforeEach(async () => {
    fixture = await TestFixture.create();
  });

  afterEach(async () => {
    await fixture.tearDown();
  });

  it('should check whether a canister exists', async () => {
    const { pic, canisterId } = fixture;

    expect(await pic.canisterExists(canisterId)).toBe(true);
    expect(
      await pic.canisterExists(generateRandomIdentity().getPrincipal()),
    ).toBe(false);
  });

  it('should delete a stopped canister', async () => {
    const { pic, canisterId } = fixture;

    await expect(pic.deleteCanister({ canisterId, sender })).rejects.toThrow(
      'must be stopped',
    );

    await pic.stopCanister({ canisterId, sender });
    await pic.deleteCanister({ canisterId, sender });

    expect(await pic.canisterExists(canisterId)).toBe(false);
  });

  it('should uninstall the code of a canister', async () => {
    const { pic, canisterId } = fixture;

    await pic.uninstallCode({ canisterId, sender });

    const status = await pic.canisterStatus({ canisterId, sender });
    expect(status.moduleHash).toBeNull();
    expect(await pic.canisterExists(canisterId)).toBe(true);
  });

  it('should reject a sender that is not a controller', async () => {
    const { pic, canisterId } = fixture;
    const other = generateRandomIdentity().getPrincipal();

    await expect(
      pic.uninstallCode({ canisterId, sender: other }),
    ).rejects.toThrow('CanisterInvalidController');
    await pic.stopCanister({ canisterId, sender });
    await expect(
      pic.deleteCanister({ canisterId, sender: other }),
    ).rejects.toThrow('CanisterInvalidController');
  });
});

describe('submitted calls', () => {
  let fixture: TestFixture;
  const sender = generateRandomIdentity().getPrincipal();
  const arg = new Uint8Array(IDL.encode([IDL.Text], ['hello']));

  beforeEach(async () => {
    fixture = await TestFixture.create();
  });

  afterEach(async () => {
    await fixture.tearDown();
  });

  it('should report the status of a submitted call', async () => {
    const { pic, canisterId } = fixture;

    const call = await pic.submitCall({
      canisterId,
      method: 'print_log',
      arg,
      sender,
    });
    expect(await pic.ingressStatus(call)).toBeNull();

    await pic.tick();

    const res = await pic.ingressStatus(call);
    expect(res).not.toBeNull();
    expect(IDL.decode([], res!)).toEqual([]);
    expect(await pic.ingressStatus(call, { caller: sender })).toEqual(res);
    expect(await pic.awaitCall(call)).toEqual(res);
  });

  it('should reject a status request from another caller', async () => {
    const { pic, canisterId } = fixture;

    const call = await pic.submitCall({
      canisterId,
      method: 'print_log',
      arg,
      sender,
    });
    await pic.tick();

    await expect(
      pic.ingressStatus(call, {
        caller: generateRandomIdentity().getPrincipal(),
      }),
    ).rejects.toThrow('not signed by the caller');
  });

  it('should await a submitted call', async () => {
    const { pic, canisterId } = fixture;

    const call = await pic.submitCall({
      canisterId,
      method: 'print_log',
      arg,
      sender,
    });

    expect(IDL.decode([], await pic.awaitCall(call))).toEqual([]);
  });

  it('should throw for a rejected call', async () => {
    const { pic, canisterId } = fixture;

    const call = await pic.submitCall({
      canisterId,
      method: 'missing_method',
      sender,
    });
    await pic.tick();

    await expect(pic.ingressStatus(call)).rejects.toThrow(
      'has no update method',
    );
    await expect(pic.awaitCall(call)).rejects.toThrow('has no update method');
  });
});
