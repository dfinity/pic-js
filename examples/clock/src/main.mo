import Time "mo:base/Time";
import { setTimer; recurringTimer } = "mo:base/Timer";
import Debug "mo:base/Debug";

actor Clock {
  private type Time = Time.Time;
  private stable var time : Time = 0;

  public query func get() : async Time {
    Debug.print("Getting current time...");
    return time / 1_000_000;
  };

  private func setTime() : async () {
    time := Time.now();
  };

  ignore setTimer<system>(
    #seconds(1),
    func() : async () {
      ignore recurringTimer<system>(#seconds 1, setTime);
      await setTime();
    },
  );
};
