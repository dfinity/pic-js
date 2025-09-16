// This is an experimental feature to generate Rust binding from Candid.
// You may want to manually adjust some of the types.
#![allow(dead_code, unused_imports)]
use candid::{self, CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult as Result;

pub type SubAccount = serde_bytes::ByteBuf;
#[derive(CandidType, Deserialize)]
pub struct Account { pub owner: Principal, pub subaccount: Option<SubAccount> }
#[derive(CandidType, Deserialize)]
pub struct FeatureFlags { pub icrc2: bool }
#[derive(CandidType, Deserialize)]
pub struct UpgradeArgs {
  pub icrc1_minting_account: Option<Account>,
  pub feature_flags: Option<FeatureFlags>,
}
#[derive(CandidType, Deserialize)]
pub struct Tokens { pub e8s: u64 }
pub type TextAccountIdentifier = String;
#[derive(CandidType, Deserialize)]
pub struct Duration { pub secs: u64, pub nanos: u32 }
#[derive(CandidType, Deserialize)]
pub struct ArchiveOptions {
  pub num_blocks_to_archive: u64,
  pub max_transactions_per_response: Option<u64>,
  pub trigger_threshold: u64,
  pub more_controller_ids: Option<Vec<Principal>>,
  pub max_message_size_bytes: Option<u64>,
  pub cycles_for_archive_creation: Option<u64>,
  pub node_max_memory_size_bytes: Option<u64>,
  pub controller_id: Principal,
}
#[derive(CandidType, Deserialize)]
pub struct InitArgs {
  pub send_whitelist: Vec<Principal>,
  pub token_symbol: Option<String>,
  pub transfer_fee: Option<Tokens>,
  pub minting_account: TextAccountIdentifier,
  pub maximum_number_of_accounts: Option<u64>,
  pub accounts_overflow_trim_quantity: Option<u64>,
  pub transaction_window: Option<Duration>,
  pub max_message_size_bytes: Option<u64>,
  pub icrc1_minting_account: Option<Account>,
  pub archive_options: Option<ArchiveOptions>,
  pub initial_values: Vec<(TextAccountIdentifier,Tokens,)>,
  pub token_name: Option<String>,
  pub feature_flags: Option<FeatureFlags>,
}
#[derive(CandidType, Deserialize)]
pub enum LedgerCanisterPayload { Upgrade(Option<UpgradeArgs>), Init(InitArgs) }
pub type AccountIdentifier = serde_bytes::ByteBuf;
#[derive(CandidType, Deserialize)]
pub struct AccountBalanceArgs { pub account: AccountIdentifier }
#[derive(CandidType, Deserialize)]
pub struct AccountBalanceArgsDfx { pub account: TextAccountIdentifier }
#[derive(CandidType, Deserialize)]
pub struct Archive { pub canister_id: Principal }
#[derive(CandidType, Deserialize)]
pub struct Archives { pub archives: Vec<Archive> }
#[derive(CandidType, Deserialize)]
pub struct DecimalsRet { pub decimals: u32 }
#[derive(CandidType, Deserialize)]
pub struct Icrc10SupportedStandardsRetItem { pub url: String, pub name: String }
pub type Icrc1Tokens = candid::Nat;
#[derive(CandidType, Deserialize)]
pub enum Value {
  Int(candid::Int),
  Nat(candid::Nat),
  Blob(serde_bytes::ByteBuf),
  Text(String),
}
#[derive(CandidType, Deserialize)]
pub struct Icrc1SupportedStandardsRetItem { pub url: String, pub name: String }
pub type Icrc1Timestamp = u64;
#[derive(CandidType, Deserialize)]
pub struct TransferArg {
  pub to: Account,
  pub fee: Option<Icrc1Tokens>,
  pub memo: Option<serde_bytes::ByteBuf>,
  pub from_subaccount: Option<SubAccount>,
  pub created_at_time: Option<Icrc1Timestamp>,
  pub amount: Icrc1Tokens,
}
pub type Icrc1BlockIndex = candid::Nat;
#[derive(CandidType, Deserialize)]
pub enum Icrc1TransferError {
  GenericError{ message: String, error_code: candid::Nat },
  TemporarilyUnavailable,
  BadBurn{ min_burn_amount: Icrc1Tokens },
  Duplicate{ duplicate_of: Icrc1BlockIndex },
  BadFee{ expected_fee: Icrc1Tokens },
  CreatedInFuture{ ledger_time: u64 },
  TooOld,
  InsufficientFunds{ balance: Icrc1Tokens },
}
#[derive(CandidType, Deserialize)]
pub enum Icrc1TransferResult { Ok(Icrc1BlockIndex), Err(Icrc1TransferError) }
#[derive(CandidType, Deserialize)]
pub struct Icrc21ConsentMessageMetadata {
  pub utc_offset_minutes: Option<i16>,
  pub language: String,
}
#[derive(CandidType, Deserialize)]
pub enum Icrc21ConsentMessageSpecDeviceSpecInner {
  GenericDisplay,
  LineDisplay{ characters_per_line: u16, lines_per_page: u16 },
}
#[derive(CandidType, Deserialize)]
pub struct Icrc21ConsentMessageSpec {
  pub metadata: Icrc21ConsentMessageMetadata,
  pub device_spec: Option<Icrc21ConsentMessageSpecDeviceSpecInner>,
}
#[derive(CandidType, Deserialize)]
pub struct Icrc21ConsentMessageRequest {
  pub arg: serde_bytes::ByteBuf,
  pub method: String,
  pub user_preferences: Icrc21ConsentMessageSpec,
}
#[derive(CandidType, Deserialize)]
pub struct Icrc21ConsentMessageLineDisplayMessagePagesItem {
  pub lines: Vec<String>,
}
#[derive(CandidType, Deserialize)]
pub enum Icrc21ConsentMessage {
  LineDisplayMessage{
    pages: Vec<Icrc21ConsentMessageLineDisplayMessagePagesItem>,
  },
  GenericDisplayMessage(String),
}
#[derive(CandidType, Deserialize)]
pub struct Icrc21ConsentInfo {
  pub metadata: Icrc21ConsentMessageMetadata,
  pub consent_message: Icrc21ConsentMessage,
}
#[derive(CandidType, Deserialize)]
pub struct Icrc21ErrorInfo { pub description: String }
#[derive(CandidType, Deserialize)]
pub enum Icrc21Error {
  GenericError{ description: String, error_code: candid::Nat },
  InsufficientPayment(Icrc21ErrorInfo),
  UnsupportedCanisterCall(Icrc21ErrorInfo),
  ConsentMessageUnavailable(Icrc21ErrorInfo),
}
#[derive(CandidType, Deserialize)]
pub enum Icrc21ConsentMessageResponse {
  Ok(Icrc21ConsentInfo),
  Err(Icrc21Error),
}
#[derive(CandidType, Deserialize)]
pub struct AllowanceArgs { pub account: Account, pub spender: Account }
#[derive(CandidType, Deserialize)]
pub struct Allowance {
  pub allowance: Icrc1Tokens,
  pub expires_at: Option<Icrc1Timestamp>,
}
#[derive(CandidType, Deserialize)]
pub struct ApproveArgs {
  pub fee: Option<Icrc1Tokens>,
  pub memo: Option<serde_bytes::ByteBuf>,
  pub from_subaccount: Option<SubAccount>,
  pub created_at_time: Option<Icrc1Timestamp>,
  pub amount: Icrc1Tokens,
  pub expected_allowance: Option<Icrc1Tokens>,
  pub expires_at: Option<Icrc1Timestamp>,
  pub spender: Account,
}
#[derive(CandidType, Deserialize)]
pub enum ApproveError {
  GenericError{ message: String, error_code: candid::Nat },
  TemporarilyUnavailable,
  Duplicate{ duplicate_of: Icrc1BlockIndex },
  BadFee{ expected_fee: Icrc1Tokens },
  AllowanceChanged{ current_allowance: Icrc1Tokens },
  CreatedInFuture{ ledger_time: u64 },
  TooOld,
  Expired{ ledger_time: u64 },
  InsufficientFunds{ balance: Icrc1Tokens },
}
#[derive(CandidType, Deserialize)]
pub enum ApproveResult { Ok(Icrc1BlockIndex), Err(ApproveError) }
#[derive(CandidType, Deserialize)]
pub struct TransferFromArgs {
  pub to: Account,
  pub fee: Option<Icrc1Tokens>,
  pub spender_subaccount: Option<SubAccount>,
  pub from: Account,
  pub memo: Option<serde_bytes::ByteBuf>,
  pub created_at_time: Option<Icrc1Timestamp>,
  pub amount: Icrc1Tokens,
}
#[derive(CandidType, Deserialize)]
pub enum TransferFromError {
  GenericError{ message: String, error_code: candid::Nat },
  TemporarilyUnavailable,
  InsufficientAllowance{ allowance: Icrc1Tokens },
  BadBurn{ min_burn_amount: Icrc1Tokens },
  Duplicate{ duplicate_of: Icrc1BlockIndex },
  BadFee{ expected_fee: Icrc1Tokens },
  CreatedInFuture{ ledger_time: Icrc1Timestamp },
  TooOld,
  InsufficientFunds{ balance: Icrc1Tokens },
}
#[derive(CandidType, Deserialize)]
pub enum TransferFromResult { Ok(Icrc1BlockIndex), Err(TransferFromError) }
#[derive(CandidType, Deserialize)]
pub struct NameRet { pub name: String }
pub type BlockIndex = u64;
#[derive(CandidType, Deserialize)]
pub struct GetBlocksArgs { pub start: BlockIndex, pub length: u64 }
pub type Memo = u64;
#[derive(CandidType, Deserialize)]
pub struct TimeStamp { pub timestamp_nanos: u64 }
#[derive(CandidType, Deserialize)]
pub enum Operation {
  Approve{
    fee: Tokens,
    from: AccountIdentifier,
    allowance_e8s: candid::Int,
    allowance: Tokens,
    expected_allowance: Option<Tokens>,
    expires_at: Option<TimeStamp>,
    spender: AccountIdentifier,
  },
  Burn{
    from: AccountIdentifier,
    amount: Tokens,
    spender: Option<AccountIdentifier>,
  },
  Mint{ to: AccountIdentifier, amount: Tokens },
  Transfer{
    to: AccountIdentifier,
    fee: Tokens,
    from: AccountIdentifier,
    amount: Tokens,
    spender: Option<serde_bytes::ByteBuf>,
  },
}
#[derive(CandidType, Deserialize)]
pub struct Transaction {
  pub memo: Memo,
  pub icrc1_memo: Option<serde_bytes::ByteBuf>,
  pub operation: Option<Operation>,
  pub created_at_time: TimeStamp,
}
#[derive(CandidType, Deserialize)]
pub struct Block {
  pub transaction: Transaction,
  pub timestamp: TimeStamp,
  pub parent_hash: Option<serde_bytes::ByteBuf>,
}
#[derive(CandidType, Deserialize)]
pub struct BlockRange { pub blocks: Vec<Block> }
#[derive(CandidType, Deserialize)]
pub enum QueryArchiveError {
  BadFirstBlockIndex{
    requested_index: BlockIndex,
    first_valid_index: BlockIndex,
  },
  Other{ error_message: String, error_code: u64 },
}
#[derive(CandidType, Deserialize)]
pub enum QueryArchiveResult { Ok(BlockRange), Err(QueryArchiveError) }
candid::define_function!(pub QueryArchiveFn : (GetBlocksArgs) -> (
    QueryArchiveResult,
  ) query);
#[derive(CandidType, Deserialize)]
pub struct ArchivedBlocksRange {
  pub callback: QueryArchiveFn,
  pub start: BlockIndex,
  pub length: u64,
}
#[derive(CandidType, Deserialize)]
pub struct QueryBlocksResponse {
  pub certificate: Option<serde_bytes::ByteBuf>,
  pub blocks: Vec<Block>,
  pub chain_length: u64,
  pub first_block_index: BlockIndex,
  pub archived_blocks: Vec<ArchivedBlocksRange>,
}
#[derive(CandidType, Deserialize)]
pub enum ArchivedEncodedBlocksRangeCallbackRet {
  Ok(Vec<serde_bytes::ByteBuf>),
  Err(QueryArchiveError),
}
candid::define_function!(pub ArchivedEncodedBlocksRangeCallback : (
    GetBlocksArgs,
  ) -> (ArchivedEncodedBlocksRangeCallbackRet) query);
#[derive(CandidType, Deserialize)]
pub struct ArchivedEncodedBlocksRange {
  pub callback: ArchivedEncodedBlocksRangeCallback,
  pub start: u64,
  pub length: u64,
}
#[derive(CandidType, Deserialize)]
pub struct QueryEncodedBlocksResponse {
  pub certificate: Option<serde_bytes::ByteBuf>,
  pub blocks: Vec<serde_bytes::ByteBuf>,
  pub chain_length: u64,
  pub first_block_index: u64,
  pub archived_blocks: Vec<ArchivedEncodedBlocksRange>,
}
#[derive(CandidType, Deserialize)]
pub struct SendArgs {
  pub to: TextAccountIdentifier,
  pub fee: Tokens,
  pub memo: Memo,
  pub from_subaccount: Option<SubAccount>,
  pub created_at_time: Option<TimeStamp>,
  pub amount: Tokens,
}
#[derive(CandidType, Deserialize)]
pub struct SymbolRet { pub symbol: String }
#[derive(CandidType, Deserialize)]
pub struct TransferArgs {
  pub to: AccountIdentifier,
  pub fee: Tokens,
  pub memo: Memo,
  pub from_subaccount: Option<SubAccount>,
  pub created_at_time: Option<TimeStamp>,
  pub amount: Tokens,
}
#[derive(CandidType, Deserialize)]
pub enum TransferError {
  TxTooOld{ allowed_window_nanos: u64 },
  BadFee{ expected_fee: Tokens },
  TxDuplicate{ duplicate_of: BlockIndex },
  TxCreatedInFuture,
  InsufficientFunds{ balance: Tokens },
}
#[derive(CandidType, Deserialize)]
pub enum TransferResult { Ok(BlockIndex), Err(TransferError) }
#[derive(CandidType, Deserialize)]
pub struct TransferFeeArg {}
#[derive(CandidType, Deserialize)]
pub struct TransferFee { pub transfer_fee: Tokens }

pub struct Service(pub Principal);
impl Service {
  pub async fn account_balance(&self, arg0: AccountBalanceArgs) -> Result<(Tokens,)> {
    ic_cdk::call(self.0, "account_balance", (arg0,)).await
  }
  pub async fn account_balance_dfx(&self, arg0: AccountBalanceArgsDfx) -> Result<(Tokens,)> {
    ic_cdk::call(self.0, "account_balance_dfx", (arg0,)).await
  }
  pub async fn account_identifier(&self, arg0: Account) -> Result<(AccountIdentifier,)> {
    ic_cdk::call(self.0, "account_identifier", (arg0,)).await
  }
  pub async fn archives(&self) -> Result<(Archives,)> {
    ic_cdk::call(self.0, "archives", ()).await
  }
  pub async fn decimals(&self) -> Result<(DecimalsRet,)> {
    ic_cdk::call(self.0, "decimals", ()).await
  }
  pub async fn icrc_10_supported_standards(&self) -> Result<(Vec<Icrc10SupportedStandardsRetItem>,)> {
    ic_cdk::call(self.0, "icrc10_supported_standards", ()).await
  }
  pub async fn icrc_1_balance_of(&self, arg0: Account) -> Result<(Icrc1Tokens,)> {
    ic_cdk::call(self.0, "icrc1_balance_of", (arg0,)).await
  }
  pub async fn icrc_1_decimals(&self) -> Result<(u8,)> {
    ic_cdk::call(self.0, "icrc1_decimals", ()).await
  }
  pub async fn icrc_1_fee(&self) -> Result<(Icrc1Tokens,)> {
    ic_cdk::call(self.0, "icrc1_fee", ()).await
  }
  pub async fn icrc_1_metadata(&self) -> Result<(Vec<(String,Value,)>,)> {
    ic_cdk::call(self.0, "icrc1_metadata", ()).await
  }
  pub async fn icrc_1_minting_account(&self) -> Result<(Option<Account>,)> {
    ic_cdk::call(self.0, "icrc1_minting_account", ()).await
  }
  pub async fn icrc_1_name(&self) -> Result<(String,)> {
    ic_cdk::call(self.0, "icrc1_name", ()).await
  }
  pub async fn icrc_1_supported_standards(&self) -> Result<(Vec<Icrc1SupportedStandardsRetItem>,)> {
    ic_cdk::call(self.0, "icrc1_supported_standards", ()).await
  }
  pub async fn icrc_1_symbol(&self) -> Result<(String,)> {
    ic_cdk::call(self.0, "icrc1_symbol", ()).await
  }
  pub async fn icrc_1_total_supply(&self) -> Result<(Icrc1Tokens,)> {
    ic_cdk::call(self.0, "icrc1_total_supply", ()).await
  }
  pub async fn icrc_1_transfer(&self, arg0: TransferArg) -> Result<(Icrc1TransferResult,)> {
    ic_cdk::call(self.0, "icrc1_transfer", (arg0,)).await
  }
  pub async fn icrc_21_canister_call_consent_message(&self, arg0: Icrc21ConsentMessageRequest) -> Result<(Icrc21ConsentMessageResponse,)> {
    ic_cdk::call(self.0, "icrc21_canister_call_consent_message", (arg0,)).await
  }
  pub async fn icrc_2_allowance(&self, arg0: AllowanceArgs) -> Result<(Allowance,)> {
    ic_cdk::call(self.0, "icrc2_allowance", (arg0,)).await
  }
  pub async fn icrc_2_approve(&self, arg0: ApproveArgs) -> Result<(ApproveResult,)> {
    ic_cdk::call(self.0, "icrc2_approve", (arg0,)).await
  }
  pub async fn icrc_2_transfer_from(&self, arg0: TransferFromArgs) -> Result<(TransferFromResult,)> {
    ic_cdk::call(self.0, "icrc2_transfer_from", (arg0,)).await
  }
  pub async fn name(&self) -> Result<(NameRet,)> {
    ic_cdk::call(self.0, "name", ()).await
  }
  pub async fn query_blocks(&self, arg0: GetBlocksArgs) -> Result<(QueryBlocksResponse,)> {
    ic_cdk::call(self.0, "query_blocks", (arg0,)).await
  }
  pub async fn query_encoded_blocks(&self, arg0: GetBlocksArgs) -> Result<(QueryEncodedBlocksResponse,)> {
    ic_cdk::call(self.0, "query_encoded_blocks", (arg0,)).await
  }
  pub async fn send_dfx(&self, arg0: SendArgs) -> Result<(BlockIndex,)> {
    ic_cdk::call(self.0, "send_dfx", (arg0,)).await
  }
  pub async fn symbol(&self) -> Result<(SymbolRet,)> {
    ic_cdk::call(self.0, "symbol", ()).await
  }
  pub async fn transfer(&self, arg0: TransferArgs) -> Result<(TransferResult,)> {
    ic_cdk::call(self.0, "transfer", (arg0,)).await
  }
  pub async fn transfer_fee(&self, arg0: TransferFeeArg) -> Result<(TransferFee,)> {
    ic_cdk::call(self.0, "transfer_fee", (arg0,)).await
  }
}

