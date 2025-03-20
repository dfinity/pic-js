import Time "mo:base/Time";

actor TestCanister {
  public query func get_time() : async Time.Time {
    return Time.now();
  };
};
