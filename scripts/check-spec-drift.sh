#!/usr/bin/env bash
set -euo pipefail

# Checks for drift between the pinned IC management canister spec and the upstream version.
# Usage: ./scripts/check-spec-drift.sh
#
# Exit codes:
#   0 - no drift detected, or drift detected (warning only)
#   1 - fetch failed

UPSTREAM_URL="https://raw.githubusercontent.com/dfinity/ic/master/rs/types/management_canister_types/tests/ic.did"
PINNED_SPEC="$(cd "$(dirname "$0")/.." && pwd)/spec/ic.did"

if [[ ! -f "$PINNED_SPEC" ]]; then
  echo "ERROR: Pinned spec not found at $PINNED_SPEC"
  exit 1
fi

TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT

echo "Fetching upstream spec from $UPSTREAM_URL ..."
if ! curl -fsSL "$UPSTREAM_URL" -o "$TMPFILE"; then
  echo "ERROR: Failed to fetch upstream spec"
  exit 1
fi

if diff -u "$PINNED_SPEC" "$TMPFILE" > /dev/null 2>&1; then
  echo "No drift detected — pinned spec matches upstream."
  exit 0
else
  echo ""
  echo "=========================================="
  echo "  SPEC DRIFT DETECTED"
  echo "=========================================="
  echo ""
  echo "The pinned spec/ic.did differs from upstream."
  echo "Upstream: $UPSTREAM_URL"
  echo ""
  echo "Diff (pinned → upstream):"
  echo ""
  diff -u "$PINNED_SPEC" "$TMPFILE" || true
  echo ""
  echo "Action required:"
  echo "  1. Review the upstream changes"
  echo "  2. Update the relevant source files to match"
  echo "  3. Re-pin the spec: curl -fsSL '$UPSTREAM_URL' -o spec/ic.did"

  # Emit GitHub Actions warning annotation if running in CI
  if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
    echo "::warning::IC management canister spec drift detected. The pinned spec/ic.did differs from upstream."
  fi

  exit 0
fi
