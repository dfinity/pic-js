import Principal "mo:base/Principal";
import PhoneBook "../declarations/phonebook/phonebook";
import SuperHeroes "../declarations/superheroes/superheroes";

actor class KeyValue(phonebook_canister_id : Principal, superheroes_canister_id : Principal) {
  private let phonebook : PhoneBook.Self = actor (Principal.toText(phonebook_canister_id));
  private let superheroes : SuperHeroes.Self = actor (Principal.toText(superheroes_canister_id));

  public func insert_phone_book_entry(name : Text, entry : PhoneBook.PhoneBookEntry) : async () {
    await phonebook.insert(name, entry);
  };

  public composite query func lookup_phone_book_entry(key : Text) : async ?PhoneBook.PhoneBookEntry {
    return await phonebook.lookup(key);
  };

  public func insert_super_hero(hero : SuperHeroes.SuperHero) : async SuperHeroes.SuperHeroId {
    return await superheroes.insert(hero);
  };

  public func lookup_super_hero(id : SuperHeroes.SuperHeroId) : async ?SuperHeroes.SuperHero {
    return await superheroes.lookup(id);
  };
};
