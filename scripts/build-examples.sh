#!/bin/bash
# Build canisters and generate TypeScript bindings for examples.
# Usage: ./scripts/build-examples.sh [name ...]
# If no names are provided, builds all canisters and generates all bindings.

set -euo pipefail

# Filter out "--" passed by pnpm when forwarding arguments
args=()
for arg in "$@"; do
  [ "$arg" != "--" ] && args+=("$arg")
done

ALL_EXAMPLES=(clock counter google_search http icp_features multicanister nns_proxy reentrancy todo)

if [ ${#args[@]} -eq 0 ]; then
  icp build
  examples=("${ALL_EXAMPLES[@]}")
else
  icp build "${args[@]}"
  examples=("${args[@]}")
fi

# Generate the bindings from the Candid interface embedded in each built WASM.
candid_dir=".icp/cache/candid"
mkdir -p "$candid_dir"

pids=()
for name in "${examples[@]}"; do
  ic-wasm ".icp/cache/artifacts/$name" metadata candid:service > "$candid_dir/$name.did"
  icp-bindgen \
    --did-file "$candid_dir/$name.did" \
    --out-dir "examples/$name" \
    --actor-disabled \
    --force &
  pids+=("$!")
done

for pid in "${pids[@]}"; do
  wait "$pid"
done
