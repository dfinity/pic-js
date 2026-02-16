module {
  public type ContactName = Text;
  public type PhoneNumber = Text;
  public type PhoneBookEntry = {
    phone : PhoneNumber;
    description : Text;
  };

  public type Self = actor {
    insert : shared (ContactName, PhoneBookEntry) -> async ();
    lookup : shared query (ContactName) -> async ?PhoneBookEntry;
  };
}
