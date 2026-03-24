use std::io;
use std::path::Path;

use tf_domain::{
    DecaySignal, DecaySignalKind, VaultFileChange, VaultScanSnapshot, WorkspaceSnapshot,
};
use tf_storage::{diff_snapshots, snapshot_vault_files};

fn detect_metric_decay(
    count: u32,
    kind: DecaySignalKind,
    reason: &str,
    recommendation: &str,
) -> Option<DecaySignal> {
    if count == 0 {
        return None;
    }

    let severity = if count < 5 {
        1
    } else if count < 20 {
        2
    } else {
        3
    };

    Some(DecaySignal {
        kind,
        severity,
        reason: format!("{reason}: {count}"),
        recommendation: recommendation.to_string(),
    })
}

pub fn detect_decay(snapshot: &WorkspaceSnapshot) -> Vec<DecaySignal> {
    let mut signals = Vec::new();

    if let Some(signal) = detect_metric_decay(
        snapshot.inbox_count,
        DecaySignalKind::InboxBacklog,
        "Inbox backlog detected",
        "Run maintenance queue: inbox cleanup",
    ) {
        signals.push(signal);
    }

    if let Some(signal) = detect_metric_decay(
        snapshot.orphaned_evidence_count,
        DecaySignalKind::OrphanedEvidence,
        "Orphaned evidence detected",
        "Link or archive orphaned evidence",
    ) {
        signals.push(signal);
    }

    if let Some(signal) = detect_metric_decay(
        snapshot.duplicate_candidate_count,
        DecaySignalKind::DuplicateCandidates,
        "Duplicate candidates detected",
        "Review and merge duplicate candidates",
    ) {
        signals.push(signal);
    }

    if let Some(signal) = detect_metric_decay(
        snapshot.broken_link_count,
        DecaySignalKind::BrokenLinks,
        "Broken links detected",
        "Run link repair workflow",
    ) {
        signals.push(signal);
    }

    if let Some(signal) = detect_metric_decay(
        snapshot.stale_commitment_count,
        DecaySignalKind::StaleCommitments,
        "Stale commitments detected",
        "Review stale commitments and update owners or due context",
    ) {
        signals.push(signal);
    }

    if let Some(signal) = detect_metric_decay(
        snapshot.outdated_working_set_count,
        DecaySignalKind::OutdatedWorkingSet,
        "Outdated working set detected",
        "Refresh working set state from active projects",
    ) {
        signals.push(signal);
    }

    signals
}

pub fn capture_vault_snapshot(vault_root: &Path) -> io::Result<VaultScanSnapshot> {
    snapshot_vault_files(vault_root)
}

pub fn reconcile_vault_snapshots(
    previous: &VaultScanSnapshot,
    current: &VaultScanSnapshot,
) -> Vec<VaultFileChange> {
    diff_snapshots(previous, current)
}

pub fn detect_external_edits(
    vault_root: &Path,
    previous: &VaultScanSnapshot,
) -> io::Result<Vec<VaultFileChange>> {
    let current = capture_vault_snapshot(vault_root)?;
    Ok(reconcile_vault_snapshots(previous, &current))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tf_domain::VaultFileChangeKind;

    #[test]
    fn returns_decay_signals_for_non_zero_metrics() {
        let snapshot = WorkspaceSnapshot {
            inbox_count: 12,
            orphaned_evidence_count: 1,
            duplicate_candidate_count: 0,
            broken_link_count: 2,
            stale_commitment_count: 5,
            outdated_working_set_count: 0,
        };

        let signals = detect_decay(&snapshot);
        assert_eq!(signals.len(), 4);
        assert!(
            signals
                .iter()
                .any(|item| item.kind == DecaySignalKind::InboxBacklog)
        );
    }

    #[test]
    fn returns_no_signals_for_clean_workspace() {
        let snapshot = WorkspaceSnapshot {
            inbox_count: 0,
            orphaned_evidence_count: 0,
            duplicate_candidate_count: 0,
            broken_link_count: 0,
            stale_commitment_count: 0,
            outdated_working_set_count: 0,
        };

        let signals = detect_decay(&snapshot);
        assert!(signals.is_empty());
    }

    #[test]
    fn computes_changes_between_snapshots() {
        let before = VaultScanSnapshot {
            vault_root: "/tmp/example".to_string(),
            scanned_at: 1,
            files: vec![tf_domain::VaultFileSnapshot {
                path: "a.md".to_string(),
                bytes: 5,
                modified_at: Some(1),
                fingerprint: "aaa".to_string(),
            }],
        };
        let after = VaultScanSnapshot {
            vault_root: "/tmp/example".to_string(),
            scanned_at: 2,
            files: vec![tf_domain::VaultFileSnapshot {
                path: "a.md".to_string(),
                bytes: 8,
                modified_at: Some(2),
                fingerprint: "bbb".to_string(),
            }],
        };

        let changes = reconcile_vault_snapshots(&before, &after);
        assert!(
            changes
                .iter()
                .any(|change| change.kind == VaultFileChangeKind::Modified)
        );
    }
}
