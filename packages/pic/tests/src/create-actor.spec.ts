import { Principal } from '@icp-sdk/core/principal';
import { generateRandomIdentity } from '../../src';
import {
  _SERVICE as TestCanister,
  idlFactory,
} from '../test-canister/declarations/test_canister.did';
import { TestFixture } from './util';

describe('createActor', () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await TestFixture.create();
  });

  afterEach(async () => {
    await fixture.tearDown();
  });

  it('should call as the anonymous principal by default', async () => {
    const actor = fixture.pic.createActor<TestCanister>({
      idlFactory,
      canisterId: fixture.canisterId,
    });

    expect((await actor.whoami()).toText()).toBe(
      Principal.anonymous().toText(),
    );
  });

  it('should call as the given sender', async () => {
    const sender = generateRandomIdentity().getPrincipal();
    const actor = fixture.pic.createActor<TestCanister>({
      idlFactory,
      canisterId: fixture.canisterId,
      sender,
    });

    expect((await actor.whoami()).toText()).toBe(sender.toText());
  });

  it('should let the sender be changed after creation', async () => {
    const other = generateRandomIdentity().getPrincipal();
    const actor = fixture.pic.createActor<TestCanister>({
      idlFactory,
      canisterId: fixture.canisterId,
      sender: generateRandomIdentity().getPrincipal(),
    });

    actor.setPrincipal(other);

    expect((await actor.whoami()).toText()).toBe(other.toText());
  });
});

describe('createDeferredActor', () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await TestFixture.create();
  });

  afterEach(async () => {
    await fixture.tearDown();
  });

  it('should call as the given sender', async () => {
    const sender = generateRandomIdentity().getPrincipal();
    const actor = fixture.pic.createDeferredActor<TestCanister>({
      idlFactory,
      canisterId: fixture.canisterId,
      sender,
    });

    const whoami = await actor.whoami();

    expect((await whoami()).toText()).toBe(sender.toText());
  });
});
