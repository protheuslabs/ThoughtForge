use tf_context_compiler::{compile_handoff_bundle, compile_resume_bundle};
use tf_domain::{AgentActionPlan, ProjectDossier};

pub fn plan_resume_project(dossier: &ProjectDossier) -> AgentActionPlan {
    AgentActionPlan {
        action_id: format!("action:resume:{}", dossier.project_id),
        action_type: "resume_project".to_string(),
        requires_approval: false,
        bundle: compile_resume_bundle(dossier),
    }
}

pub fn plan_handoff_project(dossier: &ProjectDossier, recipient: &str) -> AgentActionPlan {
    AgentActionPlan {
        action_id: format!("action:handoff:{}:{recipient}", dossier.project_id),
        action_type: "handoff_project".to_string(),
        requires_approval: true,
        bundle: compile_handoff_bundle(dossier, recipient),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dossier() -> ProjectDossier {
        ProjectDossier {
            project_id: "thoughtforge-core".to_string(),
            goal: "Ship milestone execution".to_string(),
            current_state: "M3 in progress".to_string(),
            architecture: "Rust domain with CLI orchestration".to_string(),
            key_decisions: vec!["Keep deterministic output contracts".to_string()],
            blockers: vec!["Implement remaining SRS items".to_string()],
            constraints: vec!["No destructive auto actions".to_string()],
            next_actions: vec!["Close in-progress requirements".to_string()],
            open_questions: vec!["When to start M4?".to_string()],
            evidence_refs: vec!["docs/SRS.md".to_string()],
        }
    }

    #[test]
    fn creates_resume_action_without_approval_gate() {
        let action = plan_resume_project(&dossier());
        assert_eq!(action.action_type, "resume_project");
        assert!(!action.requires_approval);
    }

    #[test]
    fn creates_handoff_action_with_approval_gate() {
        let action = plan_handoff_project(&dossier(), "ops-agent");
        assert_eq!(action.action_type, "handoff_project");
        assert!(action.requires_approval);
    }
}
