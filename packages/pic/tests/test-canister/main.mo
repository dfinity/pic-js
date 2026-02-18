import Time "mo:core/Time";

persistent actor TestCanister {
  public query func get_time() : async Time.Time {
    return Time.now();
  };
};
