import Time "mo:core/Time";
import Debug "mo:core/Debug";

persistent actor TestCanister {
  public query func get_time() : async Time.Time {
    return Time.now();
  };

  public func print_log(message : Text) : async () {
    Debug.print(message);
  };
};
