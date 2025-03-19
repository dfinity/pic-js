import { PocketIc, PocketIcServer } from '../src/index.js';

export const picServer = await PocketIcServer.start();
console.log('PocketIc server started at:', picServer.getUrl());

export async function teardown() {
  await picServer.stop();
}
