use candid::{Nat, Principal};
use ic_cdk::{
    call::{Call, CallResult},
    update,
};
use icrc_ledger_types::icrc1::account::Account;

const LEDGER_CANISTER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";

#[update]
async fn get_balance(owner: Principal) -> Nat {
    let ledger_principal = Principal::from_text(LEDGER_CANISTER_ID).unwrap();
    let ledger = LedgerService(ledger_principal);
    let (balance,) = ledger
        .icrc_1_balance_of(Account {
            owner,
            subaccount: None,
        })
        .await
        .unwrap();

    balance
}

struct LedgerService(Principal);

impl LedgerService {
    async fn icrc_1_balance_of(&self, arg0: Account) -> CallResult<(Nat,)> {
        Ok(Call::bounded_wait(self.0, "icrc1_balance_of")
            .with_arg(arg0)
            .await?
            .candid()?)
    }
}
