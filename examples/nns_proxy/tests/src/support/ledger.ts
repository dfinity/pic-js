import { AnonymousIdentity, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Actor, PocketIc } from '@hadronous/pic';
import {
  _SERVICE as LedgerService,
  SubAccount,
  idlFactory as ledgerIdlFactory,
} from '../canisters/ledger';
import { minterIdentity } from './identity';

const ICP_LEDGER_CANISTER_ID = Principal.fromText(
  'ryjl3-tyaaa-aaaaa-aaaba-cai',
);
const E8S_PER_ICP = 100_000_000;
const DEFAULT_FEE = 10_000n;

export function icpToE8s(icp: number): bigint {
  return BigInt(icp * E8S_PER_ICP);
}

export class Ledger {
  private readonly actor: Actor<LedgerService>;
  private readonly defaultIdentity = new AnonymousIdentity();

  constructor(pic: PocketIc) {
    this.actor = pic.createActor<LedgerService>(
      ledgerIdlFactory,
      ICP_LEDGER_CANISTER_ID,
    );
  }

  public async mint(
    amountE8s: bigint,
    toAccount: Principal,
    toSubAccount?: SubAccount,
    memo?: Uint8Array | number[],
  ): Promise<void> {
    return await this.transfer(
      minterIdentity,
      amountE8s,
      toAccount,
      toSubAccount,
      memo,
    );
  }

  public async transfer(
    identity: Identity,
    amountE8s: bigint,
    toAccount: Principal,
    toSubAccount?: SubAccount,
    memo?: Uint8Array | number[],
  ): Promise<void> {
    this.actor.setIdentity(identity);
    const subaccount: [] | [SubAccount] = toSubAccount ? [toSubAccount] : [];
    const optMemo: [] | [Uint8Array | number[]] = memo ? [memo] : [];

    const fromBalance = await this.actor.icrc1_balance_of({
      owner: identity.getPrincipal(),
      subaccount: [],
    });
    const toBalance = await this.actor.icrc1_balance_of({
      owner: toAccount,
      subaccount,
    });

    const result = await this.actor.icrc1_transfer({
      amount: amountE8s,
      to: {
        owner: toAccount,
        subaccount,
      },
      memo: optMemo,
      fee: [DEFAULT_FEE],
      created_at_time: [],
      from_subaccount: [],
    });
    expect('Ok' in result).toBe(true);

    const updatedFromBalance = await this.actor.icrc1_balance_of({
      owner: identity.getPrincipal(),
      subaccount: [],
    });
    expect(updatedFromBalance).toBe(fromBalance - amountE8s - DEFAULT_FEE);

    const updatedToBalance = await this.actor.icrc1_balance_of({
      owner: toAccount,
      subaccount,
    });
    expect(updatedToBalance).toBe(toBalance + amountE8s);

    this.actor.setIdentity(this.defaultIdentity);
  }
}
