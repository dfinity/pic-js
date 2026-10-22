import CertifiedData "mo:core/CertifiedData";
import Time "mo:core/Time";
import Debug "mo:core/Debug";
import Error "mo:core/Error";

persistent actor TestCanister {
  type PublicKeyResult = { #ok : Nat; #err : Text };
  type HttpMethod = { #get; #head; #post; #put; #delete; #patch };
  type HttpHeader = { name : Text; value : Text };
  type HttpResponse = { status : Nat; headers : [HttpHeader]; body : Blob };

  transient let ic : actor {
    http_request : ({
      url : Text;
      max_response_bytes : ?Nat64;
      method : HttpMethod;
      headers : [HttpHeader];
      body : ?Blob;
      transform : ?{
        function : shared query ({ response : HttpResponse; context : Blob }) -> async HttpResponse;
        context : Blob;
      };
      is_replicated : ?Bool;
    }) -> async HttpResponse;
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

  public func set_certified_data(data : Blob) : async () {
    CertifiedData.set(data);
  };

  public query func get_certificate() : async ?Blob {
    return CertifiedData.getCertificate();
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

  // Make an HTTPS outcall with the given method and return the response status.
  // Non-replicated, because the IC allows PUT, DELETE and PATCH only there.
  public func http_request_status(method : HttpMethod) : async Nat {
    let { status } = await (with cycles = 1_000_000_000_000) ic.http_request({
      url = "https://example.com/";
      max_response_bytes = null;
      method;
      headers = [];
      body = null;
      transform = null;
      is_replicated = ?false;
    });
    status;
  };

  public shared query ({ caller }) func whoami() : async Principal {
    return caller;
  };

  var value : Nat = 0;

  public func set_value(newValue : Nat) : async () {
    value := newValue;
  };

  public query func get_value() : async Nat {
    return value;
  };

  public func noop() : async () {};

  // Reads the value before awaiting a call and writes it after, so calls that
  // interleave at the await overwrite each other's increment.
  public func increment_value_after_call() : async Nat {
    let current = value;
    await noop();
    value := current + 1;
    return value;
  };
};
