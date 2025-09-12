import { resolve } from 'node:path';
import { PocketIc, Actor } from '@dfinity/pic';

import { _SERVICE, idlFactory } from '../../declarations/timers.did';

const WASM_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.dfx',
  'local',
  'canisters',
  'timers',
  'timers.wasm.gz',
);

describe('Timers', () => {
  let pic: PocketIc;
  let actor: Actor<_SERVICE>;

  beforeEach(async () => {
    pic = await PocketIc.create(process.env.PIC_URL);
    const fixture = await pic.setupCanister<_SERVICE>({ idlFactory, wasm: WASM_PATH });
    actor = fixture.actor;
  });

  afterEach(async () => {
    await pic.tearDown();
  });

  it('Check trapping function', async () => {
    try {
      await actor.trapping();
      throw new Error('Expected trapping() to throw');
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      process.stdout.write(`${msg}\n`);
      expect(msg).toContain('This is a trap message');
    }
  });

  it('progressively advances time (1s, 2s, 3s, ...) ticking once each', async () => {
    await pic.resetTime();
    await pic.tick();

    // Progress enough to cross the trap threshold (>15)
    const largeJumpMs = (4 * 3600 + 20 * 60 + 11) * 1000;
    for (let step = 1; step <= 20; step++) {
      await pic.advanceTime(step * 1_000);
      await pic.tick();

      // Insert a large time jump after the 5th tick to verify inline elapsed formatting early
      if (step === 5) {
        await pic.advanceTime(largeJumpMs);
        await pic.tick();
      }
    }

    // After crossing threshold, tick a few more times to observe repeated behavior
    for (let i = 0; i < 3; i++) {
      await pic.advanceTime(1_000);
      await pic.tick();
    }
  });

  it('Check trapping function', async () => {
    try {
      await actor.trapping();
      throw new Error('Expected trapping() to throw');
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      // Print the trap message to the console for visual inspection
      process.stdout.write(`${msg}\n`);
      expect(msg).toContain('This is a trap message');
    }
  });
});
