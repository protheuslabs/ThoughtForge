use tf_domain::{BundleItem, BundleKind, ContextBundle, ProjectDossier};

fn build_bundle_items(dossier: &ProjectDossier, objective: &str) -> Vec<BundleItem> {
    let mut items = vec![
        BundleItem {
            label: "goal".to_string(),
            reason: "Required for objective alignment".to_string(),
            value: dossier.goal.clone(),
        },
        BundleItem {
            label: "current_state".to_string(),
            reason: "Required for current project understanding".to_string(),
            value: dossier.current_state.clone(),
        },
        BundleItem {
            label: "architecture".to_string(),
            reason: "Required to avoid architectural regressions".to_string(),
            value: dossier.architecture.clone(),
        },
        BundleItem {
            label: "objective".to_string(),
            reason: "Task-specific objective for this bundle".to_string(),
            value: objective.to_string(),
        },
    ];

    for decision in &dossier.key_decisions {
        items.push(BundleItem {
            label: "decision".to_string(),
            reason: "Recent key decision".to_string(),
            value: decision.clone(),
        });
    }

    for blocker in &dossier.blockers {
        items.push(BundleItem {
            label: "blocker".to_string(),
            reason: "Known blocking condition".to_string(),
            value: blocker.clone(),
        });
    }

    for constraint in &dossier.constraints {
        items.push(BundleItem {
            label: "constraint".to_string(),
            reason: "Execution boundary or do-not-break rule".to_string(),
            value: constraint.clone(),
        });
    }

    for next_action in &dossier.next_actions {
        items.push(BundleItem {
            label: "next_action".to_string(),
            reason: "Near-term execution step".to_string(),
            value: next_action.clone(),
        });
    }

    for question in &dossier.open_questions {
        items.push(BundleItem {
            label: "open_question".to_string(),
            reason: "Unresolved item requiring consideration".to_string(),
            value: question.clone(),
        });
    }

    for evidence_ref in &dossier.evidence_refs {
        items.push(BundleItem {
            label: "evidence_ref".to_string(),
            reason: "Source evidence for validation and provenance".to_string(),
            value: evidence_ref.clone(),
        });
    }

    items
}

pub fn compile_task_bundle(dossier: &ProjectDossier, objective: &str) -> ContextBundle {
    ContextBundle {
        bundle_id: format!("bundle:task:{}:{}", dossier.project_id, slug(objective)),
        kind: BundleKind::Task,
        target: dossier.project_id.clone(),
        items: build_bundle_items(dossier, objective),
    }
}

pub fn compile_resume_bundle(dossier: &ProjectDossier) -> ContextBundle {
    ContextBundle {
        bundle_id: format!("bundle:resume:{}", dossier.project_id),
        kind: BundleKind::Resume,
        target: dossier.project_id.clone(),
        items: build_bundle_items(dossier, "resume project execution"),
    }
}

pub fn compile_handoff_bundle(dossier: &ProjectDossier, recipient: &str) -> ContextBundle {
    let objective = format!("handoff project context to {recipient}");
    ContextBundle {
        bundle_id: format!("bundle:handoff:{}:{}", dossier.project_id, slug(recipient)),
        kind: BundleKind::Handoff,
        target: dossier.project_id.clone(),
        items: build_bundle_items(dossier, &objective),
    }
}

fn slug(value: &str) -> String {
    value
        .trim()
        .to_ascii_lowercase()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dossier() -> ProjectDossier {
        ProjectDossier {
            project_id: "thoughtforge-core".to_string(),
            goal: "Ship an agent-native cognitive control plane".to_string(),
            current_state: "Foundations and execution matrix are in place".to_string(),
            architecture: "Rust core, React desktop, local-first storage".to_string(),
            key_decisions: vec!["Use open markdown as canonical evidence".to_string()],
            blockers: vec!["Need full milestone implementation".to_string()],
            constraints: vec!["Preserve local-first and explicit approvals".to_string()],
            next_actions: vec!["Close M1 must-have requirements".to_string()],
            open_questions: vec!["What is sync adapter v1?".to_string()],
            evidence_refs: vec!["docs/SRS.md".to_string()],
        }
    }

    #[test]
    fn compiles_task_bundle_with_reasoned_items() {
        let bundle = compile_task_bundle(&dossier(), "implement FR-WV-001");
        assert_eq!(bundle.kind, BundleKind::Task);
        assert!(bundle.items.iter().any(|item| item.label == "objective"));
        assert!(bundle.items.iter().any(|item| item.label == "decision"));
    }

    #[test]
    fn compiles_resume_bundle() {
        let bundle = compile_resume_bundle(&dossier());
        assert_eq!(bundle.kind, BundleKind::Resume);
        assert!(bundle.bundle_id.contains("resume"));
    }

    #[test]
    fn compiles_handoff_bundle() {
        let bundle = compile_handoff_bundle(&dossier(), "ops-agent");
        assert_eq!(bundle.kind, BundleKind::Handoff);
        assert!(bundle.bundle_id.contains("ops-agent"));
    }
}
