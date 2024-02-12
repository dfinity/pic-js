import Map "mo:base/HashMap";
import Text "mo:base/Text";

actor PhoneBook {
  public type ContactName = Text;
  public type PhoneNumber = Text;
  public type PhoneBookEntry = {
    phone : PhoneNumber;
    description : Text;
  };

  let phonebook = Map.HashMap<ContactName, PhoneBookEntry>(0, Text.equal, Text.hash);

  public func insert(name : ContactName, entry : PhoneBookEntry) : async () {
    phonebook.put(name, entry);
  };

  public query func lookup(name : ContactName) : async ?PhoneBookEntry {
    phonebook.get(name);
  };
};
