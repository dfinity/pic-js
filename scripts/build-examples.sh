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

ALL_EXAMPLES=(clock counter google_search http icp_features multicanister nns_proxy todo)

if [ ${#args[@]} -eq 0 ]; then
  icp build
  examples=("${ALL_EXAMPLES[@]}")
else
  icp build "${args[@]}"
  examples=("${args[@]}")
fi

for name in "${examples[@]}"; do
  icp-bindgen \
    --did-file "examples/$name/$name.did" \
    --out-dir "examples/$name" \
    --actor-disabled \
    --force &
done

wait
