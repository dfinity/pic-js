use candid::Principal;

fn main() {
    let governance_canister_id = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap();
    ic_cdk_bindgen::Config::new("governance", "canisters/governance.did")
        .static_callee(governance_canister_id)
        .generate();
}
