import Time "mo:core/Time";
import Debug "mo:core/Debug";
import Error "mo:core/Error";

persistent actor TestCanister {
  type PublicKeyResult = { #ok : Nat; #err : Text };

  transient let ic : actor {
    ecdsa_public_key : ({
      canister_id : ?Principal;
      derivation_path : [Blob];
      key_id : { curve : { #secp256k1 }; name : Text };
    }) -> async ({ public_key : Blob; chain_code : Blob });
    schnorr_public_key : ({
      canister_id : ?Principal;
      derivation_path : [Blob];
      key_id : { algorithm : { #bip340secp256k1; #ed25519 }; name : Text };
    }) -> async ({ public_key : Blob; chain_code : Blob });
    vetkd_public_key : ({
      canister_id : ?Principal;
      context : Blob;
      key_id : { curve : { #bls12_381_g2 }; name : Text };
    }) -> async ({ public_key : Blob });
  } = actor "aaaaa-aa";

  public query func get_time() : async Time.Time {
    return Time.now();
  };

  public func print_log(message : Text) : async () {
    Debug.print(message);
  };

  // Return the size of the public key for the given threshold key name,
  // or the rejection if the key is not available.
  public func ecdsa_public_key_size(name : Text) : async PublicKeyResult {
    try {
      let { public_key } = await ic.ecdsa_public_key({
        canister_id = null;
        derivation_path = [];
        key_id = { curve = #secp256k1; name };
      });
      #ok(public_key.size());
    } catch (e) { #err(Error.message(e)) };
  };

  public func schnorr_public_key_size(name : Text) : async PublicKeyResult {
    try {
      let { public_key } = await ic.schnorr_public_key({
        canister_id = null;
        derivation_path = [];
        key_id = { algorithm = #ed25519; name };
      });
      #ok(public_key.size());
    } catch (e) { #err(Error.message(e)) };
  };

  public func vetkd_public_key_size(name : Text) : async PublicKeyResult {
    try {
      let { public_key } = await ic.vetkd_public_key({
        canister_id = null;
        context = "";
        key_id = { curve = #bls12_381_g2; name };
      });
      #ok(public_key.size());
    } catch (e) { #err(Error.message(e)) };
  };
};
