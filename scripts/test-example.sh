#!/bin/bash
# Run tests for examples.
# Usage: ./scripts/test-example.sh [name ...]
# If no names are provided, runs tests for all examples.

set -euo pipefail

# Filter out "--" passed by pnpm when forwarding arguments
args=()
for arg in "$@"; do
  [ "$arg" != "--" ] && args+=("$arg")
done

ALL_EXAMPLES=(clock counter google_search http icp_features multicanister nns_proxy todo)

if [ ${#args[@]} -eq 0 ]; then
  examples=("${ALL_EXAMPLES[@]}")
else
  examples=("${args[@]}")
fi

pids=()
for name in "${examples[@]}"; do
  dir="examples/$name/tests"
  if [ -f "$dir/vitest.config.ts" ]; then
    vitest run -c "./$dir/vitest.config.ts" &
  elif [ -f "$dir/jest.config.ts" ]; then
    jest -c "./$dir/jest.config.ts" &
  else
    echo "No test config found for $name" >&2
    exit 1
  fi
  pids+=($!)
done

for pid in "${pids[@]}"; do
  wait "$pid" || exit 1
done
