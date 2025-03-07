import type { GlobalSetupContext } from 'vitest/node';
import { PocketIcServer } from '@dfinity/pic';

let pic: PocketIcServer | undefined;

async function setup(ctx: GlobalSetupContext): Promise<void> {
  pic = await PocketIcServer.start();
  const url = pic.getUrl();

  ctx.provide('PIC_URL', url);
}

async function teardown(): Promise<void> {
  await pic?.stop();
}

module.exports = { setup, teardown };
