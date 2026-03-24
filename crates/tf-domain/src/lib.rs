use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::path::Path;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Priority {
    Must,
    Should,
    Could,
    Quality,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Todo,
    InProgress,
    Done,
    Blocked,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Requirement {
    pub id: String,
    pub priority: Priority,
    pub summary: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RequirementExecution {
    pub requirement: Requirement,
    pub status: Status,
    pub milestone: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProjectDossier {
    pub project_id: String,
    pub goal: String,
    pub current_state: String,
    pub architecture: String,
    pub key_decisions: Vec<String>,
    pub blockers: Vec<String>,
    pub constraints: Vec<String>,
    pub next_actions: Vec<String>,
    pub open_questions: Vec<String>,
    pub evidence_refs: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BundleKind {
    Task,
    Resume,
    Handoff,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BundleItem {
    pub label: String,
    pub reason: String,
    pub value: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ContextBundle {
    pub bundle_id: String,
    pub kind: BundleKind,
    pub target: String,
    pub items: Vec<BundleItem>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WorkspaceSnapshot {
    pub inbox_count: u32,
    pub orphaned_evidence_count: u32,
    pub duplicate_candidate_count: u32,
    pub broken_link_count: u32,
    pub stale_commitment_count: u32,
    pub outdated_working_set_count: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DecaySignalKind {
    InboxBacklog,
    OrphanedEvidence,
    DuplicateCandidates,
    BrokenLinks,
    StaleCommitments,
    OutdatedWorkingSet,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DecaySignal {
    pub kind: DecaySignalKind,
    pub severity: u8,
    pub reason: String,
    pub recommendation: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AgentActionPlan {
    pub action_id: String,
    pub action_type: String,
    pub requires_approval: bool,
    pub bundle: ContextBundle,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiagnosticLevel {
    Info,
    Warn,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DiagnosticEvent {
    pub level: DiagnosticLevel,
    pub code: String,
    pub message: String,
    pub context: String,
}

pub fn append_diagnostic_jsonl(path: &Path, event: &DiagnosticEvent) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let mut file = OpenOptions::new().append(true).create(true).open(path)?;
    let serialized = serde_json::to_string(event)
        .map_err(|error| io::Error::other(format!("serialization failed: {error}")))?;
    file.write_all(serialized.as_bytes())?;
    file.write_all(b"\n")?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn creates_and_reads_domain_objects() {
        let req = Requirement {
            id: "FR-CC-001".to_string(),
            priority: Priority::Must,
            summary: "Compile task-specific context bundles.".to_string(),
        };
        assert_eq!(req.id, "FR-CC-001");
    }

    #[test]
    fn writes_diagnostic_event_as_jsonl() {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before unix epoch")
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("thoughtforge-test-{suffix}"));
        let path = dir.join("diagnostics.jsonl");

        let event = DiagnosticEvent {
            level: DiagnosticLevel::Error,
            code: "test_failure".to_string(),
            message: "test".to_string(),
            context: "unit".to_string(),
        };

        append_diagnostic_jsonl(&path, &event).expect("diagnostic write should succeed");
        let contents = std::fs::read_to_string(&path).expect("read log file");
        assert!(contents.contains("\"code\":\"test_failure\""));
    }
}
