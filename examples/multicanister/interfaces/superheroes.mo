module {
  public type SuperHeroId = Nat32;
  public type SuperHero = {
    name : Text;
    superpowers : [Text];
  };

  public type Self = actor {
    insert : shared (SuperHero) -> async SuperHeroId;
    lookup : shared query (SuperHeroId) -> async ?SuperHero;
  };
}
