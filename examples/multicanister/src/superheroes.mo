import Map "mo:core/Map";
import Nat32 "mo:core/Nat32";

persistent actor SuperHeroes {
  public type SuperHeroId = Nat32;
  public type SuperHero = {
    name : Text;
    superpowers : [Text];
  };

  private var next : SuperHeroId = 0;
  let superheroes = Map.empty<SuperHeroId, SuperHero>();

  public func insert(superhero : SuperHero) : async SuperHeroId {
    let superheroId = next;
    next += 1;

    Map.add(superheroes, Nat32.compare, superheroId, superhero);

    return superheroId;
  };

  public query func lookup(superheroId : SuperHeroId) : async ?SuperHero {
    return Map.get(superheroes, Nat32.compare, superheroId);
  };
};
