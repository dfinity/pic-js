import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PocketIc, PocketIcServer } from '../src/index.js';
import { Principal } from '@dfinity/principal';

describe('PocketIc Integration Tests', () => {
  let pic: PocketIc;
  let picServer: PocketIcServer;

  beforeAll(async () => {
    picServer = await PocketIcServer.start();
    pic = await PocketIc.create(picServer.getUrl());
  });

  afterAll(async () => {
    await pic?.tearDown();
    await picServer?.stop();
  }, 20_000);

  it('should create a new canister', async () => {
    const canisterId = await pic.createCanister({
      targetCanisterId: Principal.fromText('ivcos-eqaaa-aaaab-qablq-cai')
    });
    console.log(canisterId);
    expect(canisterId).toBeDefined();
    expect(canisterId.toText()).toBe('ivcos-eqaaa-aaaab-qablq-cai');
  });
}); 
