import Map "mo:core/Map";
import Text "mo:core/Text";

persistent actor PhoneBook {
  public type ContactName = Text;
  public type PhoneNumber = Text;
  public type PhoneBookEntry = {
    phone : PhoneNumber;
    description : Text;
  };

  let phonebook = Map.empty<ContactName, PhoneBookEntry>();

  public func insert(name : ContactName, entry : PhoneBookEntry) : async () {
    Map.add(phonebook, Text.compare, name, entry);
  };

  public query func lookup(name : ContactName) : async ?PhoneBookEntry {
    Map.get(phonebook, Text.compare, name);
  };
};
