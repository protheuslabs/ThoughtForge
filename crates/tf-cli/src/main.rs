use std::env;
use std::path::Path;

use serde_json::json;
use tf_agent_runtime::{
    builtin_core_plugins, builtin_workspace_commands, commands_from_plugins, plan_handoff_project,
    plan_resume_project,
};
use tf_context_compiler::{compile_handoff_bundle, compile_resume_bundle, compile_task_bundle};
use tf_context_daemon::{capture_vault_snapshot, detect_decay, detect_external_edits};
use tf_domain::{
    DiagnosticEvent, DiagnosticLevel, ProjectDossier, WorkspaceSnapshot, append_diagnostic_jsonl,
};
use tf_storage::{
    append_to_note, backlinks_for_note, create_markdown_note, create_vault, index_vault_markdown,
    load_workspace_registry, register_or_open_vault, switch_active_vault,
};

const DIAGNOSTIC_LOG_PATH: &str = "logs/diagnostics.jsonl";

fn main() {
    if let Err(error) = run() {
        let _ = log_event(
            DiagnosticLevel::Error,
            "cli_error",
            &error,
            "tf-cli command failed",
        );
        eprintln!("{error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let mut args = env::args().skip(1);
    let command = args
        .next()
        .ok_or_else(|| usage("No command provided".to_string()))?;
    let tail = args.collect::<Vec<_>>();

    match command.as_str() {
        "compile-task" => {
            let dossier_path = flag_value(&tail, "--dossier")?;
            let objective = flag_value(&tail, "--objective")?;
            let dossier: ProjectDossier = read_json_file(&dossier_path)?;
            let bundle = compile_task_bundle(&dossier, &objective);
            print_json(&bundle)?;
        }
        "compile-resume" => {
            let dossier_path = flag_value(&tail, "--dossier")?;
            let dossier: ProjectDossier = read_json_file(&dossier_path)?;
            let bundle = compile_resume_bundle(&dossier);
            print_json(&bundle)?;
        }
        "compile-handoff" => {
            let dossier_path = flag_value(&tail, "--dossier")?;
            let recipient = flag_value(&tail, "--recipient")?;
            let dossier: ProjectDossier = read_json_file(&dossier_path)?;
            let bundle = compile_handoff_bundle(&dossier, &recipient);
            print_json(&bundle)?;
        }
        "detect-decay" => {
            let snapshot_path = flag_value(&tail, "--snapshot")?;
            let snapshot: WorkspaceSnapshot = read_json_file(&snapshot_path)?;
            let signals = detect_decay(&snapshot);
            print_json(&signals)?;
        }
        "plan-resume" => {
            let dossier_path = flag_value(&tail, "--dossier")?;
            let dossier: ProjectDossier = read_json_file(&dossier_path)?;
            let plan = plan_resume_project(&dossier);
            print_json(&plan)?;
        }
        "plan-handoff" => {
            let dossier_path = flag_value(&tail, "--dossier")?;
            let recipient = flag_value(&tail, "--recipient")?;
            let dossier: ProjectDossier = read_json_file(&dossier_path)?;
            let plan = plan_handoff_project(&dossier, &recipient);
            print_json(&plan)?;
        }
        "list-commands" => {
            let commands = builtin_workspace_commands();
            print_json(&commands)?;
        }
        "list-core-plugins" => {
            let plugins = builtin_core_plugins();
            let registered_command_ids = commands_from_plugins(&plugins);
            print_json(&json!({
                "plugins": plugins,
                "registered_command_ids": registered_command_ids
            }))?;
        }
        "vault-create" => {
            let vault_path = flag_value(&tail, "--path")?;
            create_vault(Path::new(&vault_path))
                .map_err(|error| format!("failed to create vault {vault_path}: {error}"))?;

            let registry_path = optional_flag_value(&tail, "--registry")
                .unwrap_or_else(|| ".thoughtforge/workspace_registry.json".to_string());
            let name = optional_flag_value(&tail, "--name");
            let registry = register_or_open_vault(
                Path::new(&registry_path),
                Path::new(&vault_path),
                name.as_deref(),
            )
            .map_err(|error| format!("failed to register vault {vault_path}: {error}"))?;
            print_json(&registry)?;
        }
        "vault-open" => {
            let vault_path = flag_value(&tail, "--path")?;
            let registry_path = optional_flag_value(&tail, "--registry")
                .unwrap_or_else(|| ".thoughtforge/workspace_registry.json".to_string());
            let name = optional_flag_value(&tail, "--name");
            let registry = register_or_open_vault(
                Path::new(&registry_path),
                Path::new(&vault_path),
                name.as_deref(),
            )
            .map_err(|error| format!("failed to open vault {vault_path}: {error}"))?;
            print_json(&registry)?;
        }
        "vault-switch" => {
            let vault_id = flag_value(&tail, "--vault-id")?;
            let registry_path = optional_flag_value(&tail, "--registry")
                .unwrap_or_else(|| ".thoughtforge/workspace_registry.json".to_string());
            let registry = switch_active_vault(Path::new(&registry_path), &vault_id)
                .map_err(|error| format!("failed to switch vault {vault_id}: {error}"))?;
            print_json(&registry)?;
        }
        "vault-list" => {
            let registry_path = optional_flag_value(&tail, "--registry")
                .unwrap_or_else(|| ".thoughtforge/workspace_registry.json".to_string());
            let registry = load_workspace_registry(Path::new(&registry_path))
                .map_err(|error| format!("failed to load registry {registry_path}: {error}"))?;
            print_json(&registry)?;
        }
        "note-create" => {
            let vault_path = flag_value(&tail, "--path")?;
            let title = flag_value(&tail, "--title")?;
            let folder = optional_flag_value(&tail, "--folder");
            let body = optional_flag_value(&tail, "--body");
            let note_path = create_markdown_note(
                Path::new(&vault_path),
                folder.as_deref(),
                &title,
                body.as_deref(),
            )
            .map_err(|error| format!("failed to create note in {vault_path}: {error}"))?;
            print_json(&json!({
                "vault": vault_path,
                "note_path": note_path
            }))?;
        }
        "note-append" => {
            let vault_path = flag_value(&tail, "--path")?;
            let note_path = flag_value(&tail, "--note")?;
            let text = flag_value(&tail, "--text")?;
            append_to_note(Path::new(&vault_path), &note_path, &text)
                .map_err(|error| format!("failed to append note {note_path}: {error}"))?;
            print_json(&json!({
                "vault": vault_path,
                "note_path": note_path,
                "appended": true
            }))?;
        }
        "index-vault" => {
            let vault_path = flag_value(&tail, "--path")?;
            let index = index_vault_markdown(Path::new(&vault_path))
                .map_err(|error| format!("failed to index vault {vault_path}: {error}"))?;
            print_json(&index)?;
        }
        "backlinks" => {
            let vault_path = flag_value(&tail, "--path")?;
            let note_ref = flag_value(&tail, "--note")?;
            let index = index_vault_markdown(Path::new(&vault_path))
                .map_err(|error| format!("failed to index vault {vault_path}: {error}"))?;
            let backlinks = backlinks_for_note(&index, &note_ref);
            print_json(&json!({
                "note": note_ref,
                "backlinks": backlinks
            }))?;
        }
        "snapshot-vault" => {
            let vault_path = flag_value(&tail, "--path")?;
            let snapshot = capture_vault_snapshot(Path::new(&vault_path))
                .map_err(|error| format!("failed to snapshot vault {vault_path}: {error}"))?;
            print_json(&snapshot)?;
        }
        "detect-edits" => {
            let vault_path = flag_value(&tail, "--path")?;
            let previous_snapshot_path = flag_value(&tail, "--previous")?;
            let previous: tf_domain::VaultScanSnapshot = read_json_file(&previous_snapshot_path)?;
            let changes = detect_external_edits(Path::new(&vault_path), &previous)
                .map_err(|error| format!("failed to detect edits for {vault_path}: {error}"))?;
            print_json(&changes)?;
        }
        "srs-status" => {
            let matrix_path = flag_value(&tail, "--matrix")?;
            let contents = std::fs::read_to_string(&matrix_path)
                .map_err(|error| format!("unable to read matrix file {matrix_path}: {error}"))?;

            let mut todo = 0usize;
            let mut in_progress = 0usize;
            let mut done = 0usize;
            let mut blocked = 0usize;

            for line in contents.lines() {
                if line.contains("| `todo` |") {
                    todo += 1;
                } else if line.contains("| `in_progress` |") {
                    in_progress += 1;
                } else if line.contains("| `done` |") {
                    done += 1;
                } else if line.contains("| `blocked` |") {
                    blocked += 1;
                }
            }

            print_json(&json!({
              "todo": todo,
              "in_progress": in_progress,
              "done": done,
              "blocked": blocked
            }))?;
        }
        _ => return Err(usage(format!("Unknown command: {command}"))),
    }

    log_event(
        DiagnosticLevel::Info,
        "cli_ok",
        &command,
        "tf-cli command completed",
    )
    .map_err(|error| format!("failed to write diagnostic event: {error}"))?;

    Ok(())
}

fn usage(message: String) -> String {
    format!(
        "{message}\nUsage:\n  tf-cli compile-task --dossier <path> --objective <text>\n  tf-cli compile-resume --dossier <path>\n  tf-cli compile-handoff --dossier <path> --recipient <id>\n  tf-cli detect-decay --snapshot <path>\n  tf-cli plan-resume --dossier <path>\n  tf-cli plan-handoff --dossier <path> --recipient <id>\n  tf-cli list-commands\n  tf-cli list-core-plugins\n  tf-cli vault-create --path <vault_dir> [--name <name>] [--registry <path>]\n  tf-cli vault-open --path <vault_dir> [--name <name>] [--registry <path>]\n  tf-cli vault-switch --vault-id <id> [--registry <path>]\n  tf-cli vault-list [--registry <path>]\n  tf-cli note-create --path <vault_dir> --title <title> [--folder <folder>] [--body <text>]\n  tf-cli note-append --path <vault_dir> --note <relative_path> --text <text>\n  tf-cli index-vault --path <vault_dir>\n  tf-cli backlinks --path <vault_dir> --note <title_or_path>\n  tf-cli snapshot-vault --path <vault_dir>\n  tf-cli detect-edits --path <vault_dir> --previous <snapshot_json>\n  tf-cli srs-status --matrix <path>"
    )
}

fn flag_value(args: &[String], name: &str) -> Result<String, String> {
    let idx = args
        .iter()
        .position(|entry| entry == name)
        .ok_or_else(|| format!("missing required flag {name}"))?;
    args.get(idx + 1)
        .cloned()
        .ok_or_else(|| format!("missing value for flag {name}"))
}

fn optional_flag_value(args: &[String], name: &str) -> Option<String> {
    let idx = args.iter().position(|entry| entry == name)?;
    args.get(idx + 1).cloned()
}

fn read_json_file<T>(path: &str) -> Result<T, String>
where
    T: serde::de::DeserializeOwned,
{
    let contents =
        std::fs::read_to_string(path).map_err(|error| format!("unable to read {path}: {error}"))?;
    serde_json::from_str(&contents).map_err(|error| format!("invalid json in {path}: {error}"))
}

fn print_json<T>(value: &T) -> Result<(), String>
where
    T: serde::ser::Serialize,
{
    let output = serde_json::to_string_pretty(value)
        .map_err(|error| format!("json encode failed: {error}"))?;
    println!("{output}");
    Ok(())
}

fn log_event(
    level: DiagnosticLevel,
    code: &str,
    message: &str,
    context: &str,
) -> Result<(), String> {
    let event = DiagnosticEvent {
        level,
        code: code.to_string(),
        message: message.to_string(),
        context: context.to_string(),
    };

    append_diagnostic_jsonl(Path::new(DIAGNOSTIC_LOG_PATH), &event)
        .map_err(|error| format!("unable to write diagnostic log: {error}"))
}
