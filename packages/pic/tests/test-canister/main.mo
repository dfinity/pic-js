import Time "mo:core/Time";

persistent actor TestCanister {
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
  } = actor "aaaaa-aa";

  public query func get_time() : async Time.Time {
    return Time.now();
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
};
