import Blob "mo:base/Blob";
import Cycles "mo:base/ExperimentalCycles";
import Text "mo:base/Text";
import Types "types";

actor {
  public func google_search() : async Text {
    let ic : Types.IC = actor ("aaaaa-aa");

    let transform_context : Types.TransformContext = {
      function = transform;
      context = Blob.fromArray([]);
    };

    let http_request : Types.HttpRequestArgs = {
      url = "https://https://www.google.ch/search?q=icp";
      max_response_bytes = null;
      headers = [];
      body = null;
      method = #get;
      transform = ?transform_context;
    };

    Cycles.add<system>(1_000_000_000_000);

    let http_response : Types.HttpResponsePayload = await ic.http_request(http_request);

    let response_body : Blob = Blob.fromArray(http_response.body);
    let decoded_text : Text = switch (Text.decodeUtf8(response_body)) {
      case (null) { "No value returned" };
      case (?y) { y };
    };

    decoded_text;
  };

  public query func transform(raw : Types.TransformArgs) : async Types.CanisterHttpResponsePayload {
    let transformed : Types.CanisterHttpResponsePayload = {
      status = raw.response.status;
      body = raw.response.body;
      headers = [];
    };
    transformed;
  };
};
