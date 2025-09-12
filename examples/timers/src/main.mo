import { setTimer; recurringTimer } = "mo:base/Timer";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";

actor Timers {
  private stable var count : Nat = 0;

  ignore recurringTimer<system>(#seconds 1, func() : async () {
     Debug.print("tick " # Nat.toText(count));
    if (count == 3) {
       Debug.print("Reached 3");
       Debug.print("Some more lines checking if everything is alright. Let's put some more text here and make sure it gets printed well. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet.");
    };
    count += 1;
    if (count > 15) {
      Debug.print("You should see a trap message right after this line");
      Debug.trap("This is a trap message from a timer visible at counter > 15");
    }
  });
  
  public func trapping() : async () {
    Debug.trap("This is a trap message")
  };

};
