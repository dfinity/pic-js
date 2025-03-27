import path from 'node:path';
import { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

import { Actor, generateRandomIdentity, PocketIc } from '../../src';
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

export const CONTROLLER = generateRandomIdentity();

export type TestActor = Actor<TestCanister>;

export class TestFixture {
  readonly #pic: PocketIc;
  public get pic(): PocketIc {
    return this.#pic;
  }

  readonly #actor: Actor<TestCanister>;
  public get actor(): Actor<TestCanister> {
    return this.#actor;
  }

  readonly #canisterId: Principal;
  public get canisterId(): Principal {
    return this.#canisterId;
  }

  readonly #controller: Identity;
  public get controller(): Identity {
    return this.#controller;
  }

  private constructor(
    pic: PocketIc,
    actor: TestActor,
    canisterId: Principal,
    controller: Identity,
  ) {
    this.#pic = pic;
    this.#actor = actor;
    this.#canisterId = canisterId;
    this.#controller = controller;
  }

  public static async create(): Promise<TestFixture> {
    const controller = generateRandomIdentity();
    const pic = await PocketIc.create(process.env.PIC_URL);
    const fixture = await pic.setupCanister<TestCanister>({
      idlFactory,
      wasm: WASM_PATH,
      sender: CONTROLLER.getPrincipal(),
      controllers: [CONTROLLER.getPrincipal()],
    });

    return new TestFixture(pic, fixture.actor, fixture.canisterId, controller);
  }

  public async tearDown(): Promise<void> {
    await this.#pic.tearDown();
  }
}

export function dateToNanos(time: number | Date): bigint {
  if (time instanceof Date) {
    time = time.getTime();
  }

  return BigInt(time) * 1_000_000n;
}

export function addYears(date: Date, numYears = 1): Date {
  const newDate = new Date(date);
  newDate.setFullYear(newDate.getFullYear() + numYears);
  return newDate;
}

export function addTime(date: Date, time: number): Date {
  const newDate = new Date(date);
  newDate.setTime(newDate.getTime() + time);
  return newDate;
}
