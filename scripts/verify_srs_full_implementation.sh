#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MATRIX_PATH="${1:-$ROOT_DIR/docs/SRS_EXECUTION_MATRIX.md}"
REPORT_PATH="${2:-$ROOT_DIR/docs/SRS_FULL_IMPLEMENTATION_REPORT.md}"

if [[ ! -f "$MATRIX_PATH" ]]; then
  echo "matrix file not found: $MATRIX_PATH" >&2
  exit 1
fi

TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
NOT_DONE_LINES="$(rg '^\| `FR-|^\| `NFR-' "$MATRIX_PATH" | rg -v '\| `done` \|')"
NOT_DONE_COUNT="$(printf "%s\n" "$NOT_DONE_LINES" | sed '/^$/d' | wc -l | tr -d ' ')"

STUB_PATTERNS='todo!\(|unimplemented!\(|FIXME|TODO:|\bstub\b'
STUB_HITS="$(rg -n "$STUB_PATTERNS" "$ROOT_DIR/crates" "$ROOT_DIR/apps" || true)"
STUB_COUNT="$(printf "%s\n" "$STUB_HITS" | sed '/^$/d' | wc -l | tr -d ' ')"

{
  echo "# SRS Full Implementation Verification"
  echo
  echo "Generated at \`$TIMESTAMP\`."
  echo
  echo "## Summary"
  echo
  echo "- Requirements not marked done: $NOT_DONE_COUNT"
  echo "- Stub markers found: $STUB_COUNT"
  echo
  if [[ "$NOT_DONE_COUNT" -eq 0 && "$STUB_COUNT" -eq 0 ]]; then
    echo "Result: PASS"
  else
    echo "Result: FAIL"
  fi
  echo

  if [[ "$NOT_DONE_COUNT" -gt 0 ]]; then
    echo "## Requirements Not Done"
    echo
    printf "%s\n" "$NOT_DONE_LINES"
    echo
  fi

  if [[ "$STUB_COUNT" -gt 0 ]]; then
    echo "## Stub Markers"
    echo
    printf "%s\n" "$STUB_HITS"
    echo
  fi
} > "$REPORT_PATH"

if [[ "$NOT_DONE_COUNT" -eq 0 && "$STUB_COUNT" -eq 0 ]]; then
  echo "PASS: full implementation verified"
  exit 0
fi

echo "FAIL: see $REPORT_PATH"
exit 2
