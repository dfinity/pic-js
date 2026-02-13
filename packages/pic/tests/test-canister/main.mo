import Time "mo:base/Time";
import Debug "mo:base/Debug";

persistent actor TestCanister {
  public query func get_time() : async Time.Time {
    return Time.now();
  };

  public func print_log(message : Text) : async () {
    Debug.print(message);
  };
};
