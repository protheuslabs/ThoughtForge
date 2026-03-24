#!/usr/bin/env bash
set -euo pipefail

SRS_PATH="${1:-docs/SRS.md}"
OUT_PATH="${2:-docs/SRS_EXECUTION_MATRIX.md}"
STATUS_PATH="${3:-docs/SRS_STATUS.csv}"
GENERATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [[ ! -f "$SRS_PATH" ]]; then
  echo "SRS file not found: $SRS_PATH" >&2
  exit 1
fi

awk -v generated_at="$GENERATED_AT" -v status_path="$STATUS_PATH" '
function milestone_for(req_id) {
  if (req_id ~ /^FR-(WV|CI|ED)-/) return "M1 - Vault and Capture Foundation"
  if (req_id ~ /^FR-(CX|LM|ML)-/) return "M2 - Context and Memory Model"
  if (req_id ~ /^FR-(CD|CC)-/) return "M3 - Daemon and Context Compiler"
  if (req_id ~ /^FR-(SR|KG)-/) return "M4 - Retrieval and Knowledge Graph"
  if (req_id ~ /^FR-(AG|DP)-/) return "M5 - Agent Runtime and Delegation"
  if (req_id ~ /^FR-EG-/) return "M6 - External Grounding"
  if (req_id ~ /^FR-SC-/) return "M7 - Sync and Collaboration"
  if (req_id ~ /^FR-IE-/) return "M8 - Interop and CLI"
  if (req_id ~ /^FR-(SP|OE)-/) return "M9 - Trust, Safety, and Evaluation"
  if (req_id ~ /^NFR-/) return "QG - Quality Gates"
  return "UNASSIGNED"
}

function load_status_overrides(  line, parts, req_id, status) {
  if ((getline line < status_path) < 0) {
    close(status_path)
    return
  }
  close(status_path)

  while ((getline line < status_path) > 0) {
    gsub(/\r/, "", line)
    if (line == "" || line ~ /^#/ || line ~ /^requirement_id,/) {
      continue
    }
    split(line, parts, ",")
    req_id = parts[1]
    status = parts[2]
    if (req_id != "" && status != "") {
      statuses[req_id] = status
    }
  }
  close(status_path)
}

function row(req_id, priority, summary, status) {
  gsub(/\|/, "\\|", summary)
  status = (req_id in statuses ? statuses[req_id] : "todo")
  print "| `" req_id "` | `" priority "` | " milestone_for(req_id) " | `" status "` | " summary " |"
}

BEGIN {
  load_status_overrides()

  print "# SRS Execution Matrix"
  print ""
  print "Generated from `" ARGV[1] "` at `" generated_at "`."
  print ""
  print "Legend:"
  print "- `todo`: not started"
  print "- `in_progress`: currently being implemented"
  print "- `done`: implemented and verified"
  print "- `blocked`: cannot proceed pending dependency"
  print ""
  print "| Requirement | Priority | Milestone | Status | Summary |"
  print "| --- | --- | --- | --- | --- |"
}

{
  if ($0 ~ /^- FR-[A-Z][A-Z]-[0-9][0-9][0-9] \([A-Za-z]+\): /) {
    req_id = $2
    priority = $3
    gsub(/[():]/, "", priority)
    summary = $0
    sub(/^- FR-[A-Z][A-Z]-[0-9][0-9][0-9] \([A-Za-z]+\): /, "", summary)
    row(req_id, priority, summary)
  } else if ($0 ~ /^- NFR-[0-9][0-9][0-9] [^:]+: /) {
    req_id = $2
    summary = $0
    sub(/^- NFR-[0-9][0-9][0-9] /, "", summary)
    row(req_id, "Quality", summary)
  }
}
' "$SRS_PATH" > "$OUT_PATH"

echo "Wrote $OUT_PATH"
