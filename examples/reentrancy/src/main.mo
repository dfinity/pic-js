import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

persistent actor Bank {
  type WithdrawResult = { #ok; #err : { #InsufficientFunds; #TransferFailed } };

  let balances = Map.empty<Principal, Nat>();
  var paidOut : Nat = 0;

  func balanceOf(owner : Principal) : Nat {
    switch (Map.get(balances, Principal.compare, owner)) {
      case (?balance) balance;
      case null 0;
    };
  };

  func setBalance(owner : Principal, balance : Nat) {
    Map.add(balances, Principal.compare, owner, balance);
  };

  public shared ({ caller }) func deposit(amount : Nat) : async () {
    setBalance(caller, balanceOf(caller) + amount);
  };

  public shared query ({ caller }) func balance() : async Nat {
    balanceOf(caller);
  };

  public query func paid_out() : async Nat {
    paidOut;
  };

  // Stands in for a ledger transfer: an inter-canister call that a withdrawal
  // has to await, during which the canister can execute other calls.
  public shared ({ caller }) func transfer(_to : Principal, amount : Nat) : async () {
    if (caller != Principal.fromActor(Bank)) Runtime.trap("only the bank can transfer");
    paidOut += amount;
  };

  // Checks the balance before the await and deducts it after, so a second
  // withdrawal executed during the await passes the same check.
  public shared ({ caller }) func withdraw_vulnerable(amount : Nat) : async WithdrawResult {
    if (balanceOf(caller) < amount) return #err(#InsufficientFunds);
    await transfer(caller, amount);
    setBalance(caller, balanceOf(caller) - amount);
    #ok;
  };

  // Deducts the balance before the await, and refunds it if the transfer fails.
  public shared ({ caller }) func withdraw_fixed(amount : Nat) : async WithdrawResult {
    let balance = balanceOf(caller);
    if (balance < amount) return #err(#InsufficientFunds);
    setBalance(caller, balance - amount);
    try {
      await transfer(caller, amount);
    } catch (_) {
      setBalance(caller, balanceOf(caller) + amount);
      return #err(#TransferFailed);
    };
    #ok;
  };
};
