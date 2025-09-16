use candid::{Nat, Principal};
use ic_cdk::*;
use ledger::{Account, Service as LedgerService};

mod ledger;

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
