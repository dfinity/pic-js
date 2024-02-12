import List "mo:base/List";
import Option "mo:base/Option";
import Trie "mo:base/Trie";
import Nat32 "mo:base/Nat32";

actor SuperHeroes {
  public type SuperHeroId = Nat32;
  public type SuperHero = {
    name : Text;
    superpowers : List.List<Text>;
  };

  private stable var next : SuperHeroId = 0;
  private stable var superheroes : Trie.Trie<SuperHeroId, SuperHero> = Trie.empty();

  public func insert(superhero : SuperHero) : async SuperHeroId {
    let superheroId = next;
    next += 1;

    superheroes := Trie.replace(
      superheroes,
      key(superheroId),
      Nat32.equal,
      ?superhero,
    ).0;

    return superheroId;
  };

  public query func lookup(superheroId : SuperHeroId) : async ?SuperHero {
    return Trie.find(superheroes, key(superheroId), Nat32.equal);
  };

  private func key(x : SuperHeroId) : Trie.Key<SuperHeroId> {
    return { hash = x; key = x };
  };
};
