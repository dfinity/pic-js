import { resolve } from 'path';
import { Actor, PocketIc, SubnetStateType } from '@hadronous/pic';
import { IDL } from '@dfinity/candid';

import {
  PhoneBookEntry,
  SuperHero,
  _SERVICE,
  idlFactory,
  init,
} from '../../declarations/multicanister/multicanister.did';

const MAIN_WASM_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.dfx',
  'local',
  'canisters',
  'multicanister',
  'multicanister.wasm.gz',
);

const PHONEBOOK_WASM_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.dfx',
  'local',
  'canisters',
  'phonebook',
  'phonebook.wasm.gz',
);

const SUPERHEROES_WASM_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.dfx',
  'local',
  'canisters',
  'superheroes',
  'superheroes.wasm.gz',
);

describe('Multicanister', () => {
  let pic: PocketIc;
  let actor: Actor<_SERVICE>;

  beforeEach(async () => {
    pic = await PocketIc.create(process.env.PIC_URL, {
      application: [
        { state: { type: SubnetStateType.New } },
        { state: { type: SubnetStateType.New } },
      ],
    });

    const applicationSubnets = pic.getApplicationSubnets();
    const mainSubnet = applicationSubnets[0];
    const heroesSubnet = applicationSubnets[1];

    const phoneBookCanisterId = await pic.createCanister({
      targetSubnetId: mainSubnet.id,
    });
    await pic.installCode({
      wasm: PHONEBOOK_WASM_PATH,
      canisterId: phoneBookCanisterId,
      targetSubnetId: mainSubnet.id,
    });

    const heroesCanisterId = await pic.createCanister({
      targetSubnetId: heroesSubnet.id,
    });
    await pic.installCode({
      wasm: SUPERHEROES_WASM_PATH,
      canisterId: heroesCanisterId,
    });

    const fixture = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: MAIN_WASM_PATH,
      targetSubnetId: mainSubnet.id,
      arg: IDL.encode(init({ IDL }), [phoneBookCanisterId, heroesCanisterId]),
    });
    actor = fixture.actor;
  });

  afterEach(async () => {
    await pic.tearDown();
  });

  describe('phone book', () => {
    it('should insert and retrieve a contact', async () => {
      const contactName = 'Alice';
      const entry: PhoneBookEntry = {
        phone: '123-456-7890',
        description: 'Alice in Wonderland',
      };

      await actor.insert_phone_book_entry(contactName, entry);
      const result = await actor.lookup_phone_book_entry(contactName);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(entry);
    });
  });

  describe('superheroes', () => {
    it('should insert and retrieve a superhero', async () => {
      const name = 'Superman';
      const superHero: SuperHero = {
        name,
        superpowers: [['flight', [['super strength', [['heat vision', []]]]]]],
      };

      const id = await actor.insert_super_hero(superHero);
      const result = await actor.lookup_super_hero(id);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(superHero);
    });
  });
});
