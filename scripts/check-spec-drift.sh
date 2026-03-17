#!/usr/bin/env bash
set -euo pipefail

# Checks for drift between the pinned IC management canister spec and the upstream version.
# Usage: ./scripts/check-spec-drift.sh
#
# Exit codes:
#   0 - no drift detected, drift detected (warning), or fetch failed (warning)
#   1 - pinned spec file missing

UPSTREAM_URL="https://raw.githubusercontent.com/dfinity/ic/master/rs/types/management_canister_types/tests/ic.did"
PINNED_SPEC="$(cd "$(dirname "$0")/.." && pwd)/spec/ic.did"

if [[ ! -f "$PINNED_SPEC" ]]; then
  echo "ERROR: Pinned spec not found at $PINNED_SPEC"
  exit 1
fi

TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT

echo "Fetching upstream spec from $UPSTREAM_URL ..."
if ! curl -fsSL --retry 3 --retry-all-errors --connect-timeout 5 --max-time 60 "$UPSTREAM_URL" -o "$TMPFILE"; then
  echo "WARNING: Failed to fetch upstream spec — skipping drift check"
  if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
    echo "::warning::Failed to fetch upstream IC spec — drift check skipped"
  fi
  exit 0
fi

DIFF_OUTPUT=$(diff -u "$PINNED_SPEC" "$TMPFILE" || true)

if [[ -z "$DIFF_OUTPUT" ]]; then
  echo "No drift detected — pinned spec matches upstream."
  exit 0
fi

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
echo "$DIFF_OUTPUT"
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
