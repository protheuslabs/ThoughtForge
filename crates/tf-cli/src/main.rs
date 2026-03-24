use std::env;
use std::path::Path;

use serde_json::json;
use tf_agent_runtime::{plan_handoff_project, plan_resume_project};
use tf_context_compiler::{compile_handoff_bundle, compile_resume_bundle, compile_task_bundle};
use tf_context_daemon::detect_decay;
use tf_domain::{
    DiagnosticEvent, DiagnosticLevel, ProjectDossier, WorkspaceSnapshot, append_diagnostic_jsonl,
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
        "{message}\nUsage:\n  tf-cli compile-task --dossier <path> --objective <text>\n  tf-cli compile-resume --dossier <path>\n  tf-cli compile-handoff --dossier <path> --recipient <id>\n  tf-cli detect-decay --snapshot <path>\n  tf-cli plan-resume --dossier <path>\n  tf-cli plan-handoff --dossier <path> --recipient <id>\n  tf-cli srs-status --matrix <path>"
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
