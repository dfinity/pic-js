import Nat "mo:base/Nat";

actor class Counter(initial_count : Nat) {
  private stable var counter = initial_count;

  public query func get() : async Nat {
    return counter;
  };

  public func set(n : Nat) : async () {
    counter := n;
  };

  public func inc() : async () {
    counter += 1;
  };

  public func dec() : async () {
    counter -= 1;
  };
};
