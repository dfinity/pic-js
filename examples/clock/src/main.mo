import Time "mo:core/Time";
import { setTimer; recurringTimer } = "mo:core/Timer";

persistent actor Clock {
  private type Time = Time.Time;
  private var time : Time = 0;

  public query func get() : async Time {
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
