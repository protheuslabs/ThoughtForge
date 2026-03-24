use tf_agent_runtime::plan_resume_project;
use tf_domain::ProjectDossier;

fn main() {
    let dossier = ProjectDossier {
        project_id: "thoughtforge-core".to_string(),
        goal: "Deliver full SRS-compliant implementation".to_string(),
        current_state: "Execution foundation and matrix are in place".to_string(),
        architecture: "Desktop shell + Rust core + deterministic CLI".to_string(),
        key_decisions: vec!["Treat notes as evidence, not only primitive".to_string()],
        blockers: vec!["Most requirements still pending implementation".to_string()],
        constraints: vec!["Local-first and explicit approval guardrails".to_string()],
        next_actions: vec!["Execute M1 must-have requirements".to_string()],
        open_questions: vec!["Scope for first integration adapters".to_string()],
        evidence_refs: vec!["docs/SRS.md".to_string()],
    };

    let action = plan_resume_project(&dossier);
    println!(
        "Thoughtforge desktop bootstrap action: {}",
        action.action_id
    );
}
