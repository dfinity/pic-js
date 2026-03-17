#!/usr/bin/env bash
set -euo pipefail

# Checks for drift between a pinned commit and the latest master of the IC spec.
# Source: https://github.com/dfinity/portal/blob/master/docs/references/_attachments/ic.did
# Usage: ./scripts/check-spec-drift.sh <pinned-commit>
#
# Exit codes:
#   0 - no drift detected, drift detected (warning), or fetch failed (warning)

SPEC_PATH="docs/references/_attachments/ic.did"
BASE_URL="https://raw.githubusercontent.com/dfinity/portal"

PINNED_COMMIT="$1"
PINNED_URL="${BASE_URL}/${PINNED_COMMIT}/${SPEC_PATH}"
LATEST_URL="${BASE_URL}/master/${SPEC_PATH}"

CURL_OPTS=(--retry 3 --retry-all-errors --connect-timeout 10 --max-time 60 -fsSL)

PINNED_FILE=$(mktemp)
LATEST_FILE=$(mktemp)
trap 'rm -f "$PINNED_FILE" "$LATEST_FILE"' EXIT

echo "Fetching pinned spec at commit '${PINNED_COMMIT}' ..."
if ! curl "${CURL_OPTS[@]}" "$PINNED_URL" -o "$PINNED_FILE"; then
  echo "WARNING: Failed to fetch pinned spec at commit '${PINNED_COMMIT}' — skipping drift check"
  if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
    echo "::warning::Failed to fetch IC spec at pinned commit '${PINNED_COMMIT}' — drift check skipped"
  fi
  exit 0
fi

echo "Fetching latest spec from master ..."
if ! curl "${CURL_OPTS[@]}" "$LATEST_URL" -o "$LATEST_FILE"; then
  echo "WARNING: Failed to fetch latest spec from master — skipping drift check"
  if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
    echo "::warning::Failed to fetch latest IC spec from master — drift check skipped"
  fi
  exit 0
fi

DIFF_OUTPUT=$(diff -u "$PINNED_FILE" "$LATEST_FILE" || true)

if [[ -z "$DIFF_OUTPUT" ]]; then
  echo "No drift detected — pinned commit '${PINNED_COMMIT}' matches upstream master."
  exit 0
fi

echo ""
echo "=========================================="
echo "  SPEC DRIFT DETECTED"
echo "=========================================="
echo ""
echo "The IC spec at pinned commit '${PINNED_COMMIT}' differs from master."
echo "Pinned:  $PINNED_URL"
echo "Latest:  $LATEST_URL"
echo ""
echo "Diff (pinned → latest):"
echo ""
echo "$DIFF_OUTPUT"
echo ""
echo "Action required:"
echo "  1. Review the upstream changes"
echo "  2. Update the relevant source files to match the latest spec"
echo "  3. Update the pinned commit in .github/workflows/check-spec-drift.yml"

# Emit GitHub Actions warning annotation if running in CI
if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
  echo "::warning::IC spec drift detected — pinned commit '${PINNED_COMMIT}' differs from upstream master."
fi

exit 0
