use tf_context_compiler::{compile_handoff_bundle, compile_resume_bundle};
use tf_domain::{AgentActionPlan, CommandScope, CorePluginSpec, ProjectDossier, WorkspaceCommand};

pub fn builtin_workspace_commands() -> Vec<WorkspaceCommand> {
    vec![
        WorkspaceCommand {
            id: "command-palette:open".to_string(),
            name: "Open command palette".to_string(),
            description: "Show global command registry and execute commands".to_string(),
            hotkeys: vec!["Mod+P".to_string()],
            scope: CommandScope::App,
        },
        WorkspaceCommand {
            id: "switcher:open".to_string(),
            name: "Open quick switcher".to_string(),
            description: "Find and open notes by title or path".to_string(),
            hotkeys: vec!["Mod+O".to_string()],
            scope: CommandScope::Workspace,
        },
        WorkspaceCommand {
            id: "file-explorer:new-file".to_string(),
            name: "Create new note".to_string(),
            description: "Create a note in the active vault".to_string(),
            hotkeys: vec!["Mod+N".to_string()],
            scope: CommandScope::Workspace,
        },
        WorkspaceCommand {
            id: "daily-note:open-today".to_string(),
            name: "Open today daily note".to_string(),
            description: "Open or create today daily note from configured capture settings."
                .to_string(),
            hotkeys: vec!["Mod+Shift+D".to_string()],
            scope: CommandScope::Workspace,
        },
        WorkspaceCommand {
            id: "capture:append-inbox".to_string(),
            name: "Capture to inbox".to_string(),
            description: "Open quick capture flow and append to inbox note.".to_string(),
            hotkeys: vec!["Mod+Shift+I".to_string()],
            scope: CommandScope::Workspace,
        },
        WorkspaceCommand {
            id: "capture:append-daily".to_string(),
            name: "Capture to daily note".to_string(),
            description: "Open quick capture flow and append to daily note.".to_string(),
            hotkeys: vec!["Mod+Shift+J".to_string()],
            scope: CommandScope::Workspace,
        },
        WorkspaceCommand {
            id: "capture:append-active-note".to_string(),
            name: "Capture to active note".to_string(),
            description: "Open quick capture flow and append to selected note.".to_string(),
            hotkeys: vec!["Mod+Shift+K".to_string()],
            scope: CommandScope::Editor,
        },
        WorkspaceCommand {
            id: "markdown:toggle-preview".to_string(),
            name: "Toggle markdown preview".to_string(),
            description: "Switch between source and rendered note modes".to_string(),
            hotkeys: vec!["Mod+E".to_string()],
            scope: CommandScope::Editor,
        },
        WorkspaceCommand {
            id: "workspace:split-vertical".to_string(),
            name: "Split editor vertically".to_string(),
            description: "Open split view for source and preview panes".to_string(),
            hotkeys: vec!["Mod+\\".to_string()],
            scope: CommandScope::Editor,
        },
        WorkspaceCommand {
            id: "insert:callout".to_string(),
            name: "Insert callout".to_string(),
            description: "Insert structured callout block at editor cursor.".to_string(),
            hotkeys: vec!["Mod+Shift+C".to_string()],
            scope: CommandScope::Editor,
        },
        WorkspaceCommand {
            id: "insert:decision-block".to_string(),
            name: "Insert decision block".to_string(),
            description: "Insert decision metadata template at editor cursor.".to_string(),
            hotkeys: vec!["Mod+Shift+R".to_string()],
            scope: CommandScope::Editor,
        },
        WorkspaceCommand {
            id: "insert:task".to_string(),
            name: "Insert task".to_string(),
            description: "Insert checklist item at editor cursor.".to_string(),
            hotkeys: vec!["Mod+Shift+T".to_string()],
            scope: CommandScope::Editor,
        },
        WorkspaceCommand {
            id: "app:toggle-left-sidebar".to_string(),
            name: "Toggle left sidebar".to_string(),
            description: "Show or hide the navigation and file explorer".to_string(),
            hotkeys: vec!["Mod+Alt+Left".to_string()],
            scope: CommandScope::App,
        },
        WorkspaceCommand {
            id: "app:toggle-right-sidebar".to_string(),
            name: "Toggle right sidebar".to_string(),
            description: "Show or hide backlinks and note inspector".to_string(),
            hotkeys: vec!["Mod+Alt+Right".to_string()],
            scope: CommandScope::App,
        },
    ]
}

pub fn builtin_core_plugins() -> Vec<CorePluginSpec> {
    vec![
        CorePluginSpec {
            id: "file-explorer".to_string(),
            name: "File Explorer".to_string(),
            description: "Vault tree navigation, note operations, and metadata routing."
                .to_string(),
            hooks: vec![
                "on_app_start".to_string(),
                "on_vault_open".to_string(),
                "on_note_create".to_string(),
            ],
            command_ids: vec![
                "file-explorer:new-file".to_string(),
                "switcher:open".to_string(),
                "daily-note:open-today".to_string(),
                "capture:append-inbox".to_string(),
                "capture:append-daily".to_string(),
            ],
            capability_scopes: vec![CommandScope::Workspace, CommandScope::App],
        },
        CorePluginSpec {
            id: "editor".to_string(),
            name: "Markdown Editor".to_string(),
            description: "Source/preview editing, split panes, and markdown command handling."
                .to_string(),
            hooks: vec![
                "on_note_open".to_string(),
                "on_note_save".to_string(),
                "on_layout_change".to_string(),
            ],
            command_ids: vec![
                "markdown:toggle-preview".to_string(),
                "workspace:split-vertical".to_string(),
                "capture:append-active-note".to_string(),
                "insert:callout".to_string(),
                "insert:decision-block".to_string(),
                "insert:task".to_string(),
            ],
            capability_scopes: vec![CommandScope::Editor, CommandScope::Workspace],
        },
        CorePluginSpec {
            id: "command-palette".to_string(),
            name: "Command Palette".to_string(),
            description: "Global command registry and dispatch control surface.".to_string(),
            hooks: vec![
                "on_app_start".to_string(),
                "on_command_register".to_string(),
                "on_command_execute".to_string(),
            ],
            command_ids: vec![
                "command-palette:open".to_string(),
                "app:toggle-left-sidebar".to_string(),
                "app:toggle-right-sidebar".to_string(),
            ],
            capability_scopes: vec![CommandScope::App, CommandScope::Workspace],
        },
    ]
}

pub fn commands_from_plugins(plugins: &[CorePluginSpec]) -> Vec<String> {
    let mut command_ids = plugins
        .iter()
        .flat_map(|plugin| plugin.command_ids.clone())
        .collect::<Vec<_>>();
    command_ids.sort();
    command_ids.dedup();
    command_ids
}

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

    #[test]
    fn exposes_builtin_workspace_commands() {
        let commands = builtin_workspace_commands();
        assert!(
            commands
                .iter()
                .any(|command| command.id == "command-palette:open")
        );
        assert!(commands.iter().any(|command| command.id == "switcher:open"));
    }

    #[test]
    fn exposes_builtin_core_plugins_and_registered_commands() {
        let plugins = builtin_core_plugins();
        assert!(plugins.iter().any(|plugin| plugin.id == "file-explorer"));

        let command_ids = commands_from_plugins(&plugins);
        assert!(command_ids.iter().any(|id| id == "command-palette:open"));
        assert!(
            command_ids
                .iter()
                .any(|id| id == "workspace:split-vertical")
        );
    }
}
