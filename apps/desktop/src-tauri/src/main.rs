use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::State;
use tf_domain::{
    CaptureAppendResult, CaptureTarget, DailyNoteConfig, IndexedNote, WorkspaceRegistry,
};
use tf_storage::{
    append_capture, create_markdown_note, create_vault, ensure_daily_note, index_vault_markdown,
    load_workspace_registry, register_or_open_vault, switch_active_vault,
};

#[derive(Clone)]
struct DesktopRuntimeState {
    registry_path: PathBuf,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopVaultSummary {
    id: String,
    name: String,
    root_path: String,
    last_opened_at: u64,
    is_active: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopNoteSnapshot {
    id: String,
    path: String,
    title: String,
    tags: Vec<String>,
    links: Vec<String>,
    content: String,
    updated_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopVaultSnapshot {
    id: String,
    name: String,
    root_path: String,
    notes: Vec<DesktopNoteSnapshot>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopWorkspaceState {
    is_macos: bool,
    registry_path: String,
    active_vault_id: Option<String>,
    vaults: Vec<DesktopVaultSummary>,
    active_vault: Option<DesktopVaultSnapshot>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopCaptureResponse {
    result: CaptureAppendResult,
    note: DesktopNoteSnapshot,
}

fn default_registry_path() -> PathBuf {
    if let Some(home) = dirs::home_dir() {
        return home.join(".thoughtforge").join("workspace_registry.json");
    }
    PathBuf::from(".thoughtforge").join("workspace_registry.json")
}

fn ensure_registry_parent(path: &Path) -> Result<(), String> {
    let Some(parent) = path.parent() else {
        return Ok(());
    };
    fs::create_dir_all(parent).map_err(|error| {
        format!(
            "failed to create registry directory {}: {error}",
            parent.display()
        )
    })
}

fn normalize_relative_path(path: &str) -> String {
    path.replace('\\', "/").trim_start_matches("./").to_string()
}

fn decode_capture_target(value: &str) -> Result<CaptureTarget, String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "inbox" => Ok(CaptureTarget::Inbox),
        "daily" => Ok(CaptureTarget::Daily),
        "note" | "selected" | "selected_note" | "active" => Ok(CaptureTarget::SelectedNote),
        other => Err(format!(
            "unsupported capture target '{other}'. expected inbox|daily|note"
        )),
    }
}

fn daily_config_from_options(
    folder: Option<String>,
    pattern: Option<String>,
    heading: Option<String>,
) -> DailyNoteConfig {
    DailyNoteConfig {
        folder: folder
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "00 Daily".to_string()),
        file_name_pattern: pattern
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "%Y-%m-%d".to_string()),
        heading_template: heading
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "# Daily Note - {date}".to_string()),
    }
}

fn load_registry(registry_path: &Path) -> Result<WorkspaceRegistry, String> {
    ensure_registry_parent(registry_path)?;
    load_workspace_registry(registry_path).map_err(|error| {
        format!(
            "failed to load workspace registry {}: {error}",
            registry_path.display()
        )
    })
}

fn read_indexed_note(vault_root: &Path, note: IndexedNote) -> Result<DesktopNoteSnapshot, String> {
    let content_path = vault_root.join(&note.path);
    let content = fs::read_to_string(&content_path)
        .map_err(|error| format!("failed to read note {}: {error}", content_path.display()))?;
    Ok(DesktopNoteSnapshot {
        id: note.id,
        path: note.path,
        title: note.title,
        tags: note.tags,
        links: note.links,
        content,
        updated_at: note.updated_at,
    })
}

fn load_note_by_path(vault_root: &Path, note_path: &str) -> Result<DesktopNoteSnapshot, String> {
    let normalized = normalize_relative_path(note_path).to_ascii_lowercase();
    let index = index_vault_markdown(vault_root)
        .map_err(|error| format!("failed to index vault {}: {error}", vault_root.display()))?;

    let Some(note) = index.notes.into_iter().find(|candidate| {
        normalize_relative_path(&candidate.path).to_ascii_lowercase() == normalized
    }) else {
        return Err(format!("note not found in vault index: {note_path}"));
    };

    read_indexed_note(vault_root, note)
}

fn load_active_vault_snapshot(
    registry: &WorkspaceRegistry,
) -> Result<Option<DesktopVaultSnapshot>, String> {
    let Some(active_id) = registry.active_vault_id.as_deref() else {
        return Ok(None);
    };
    let Some(active_registration) = registry.vaults.iter().find(|vault| vault.id == active_id)
    else {
        return Ok(None);
    };

    let vault_root = Path::new(&active_registration.root_path);
    create_vault(vault_root).map_err(|error| {
        format!(
            "failed to initialize vault {}: {error}",
            vault_root.display()
        )
    })?;
    let mut index = index_vault_markdown(vault_root)
        .map_err(|error| format!("failed to index vault {}: {error}", vault_root.display()))?;
    index
        .notes
        .sort_by(|left, right| left.path.cmp(&right.path));

    let mut notes = Vec::new();
    for note in index.notes {
        notes.push(read_indexed_note(vault_root, note)?);
    }

    Ok(Some(DesktopVaultSnapshot {
        id: active_registration.id.clone(),
        name: active_registration.name.clone(),
        root_path: active_registration.root_path.clone(),
        notes,
    }))
}

fn workspace_state(registry_path: &Path) -> Result<DesktopWorkspaceState, String> {
    let registry = load_registry(registry_path)?;
    let active_vault = load_active_vault_snapshot(&registry)?;
    let active_id = registry.active_vault_id.clone();
    let vaults = registry
        .vaults
        .iter()
        .map(|vault| DesktopVaultSummary {
            id: vault.id.clone(),
            name: vault.name.clone(),
            root_path: vault.root_path.clone(),
            last_opened_at: vault.last_opened_at,
            is_active: active_id.as_deref() == Some(vault.id.as_str()),
        })
        .collect::<Vec<_>>();

    Ok(DesktopWorkspaceState {
        is_macos: cfg!(target_os = "macos"),
        registry_path: registry_path.to_string_lossy().to_string(),
        active_vault_id: active_id,
        vaults,
        active_vault,
    })
}

#[tauri::command]
fn desktop_bootstrap(state: State<DesktopRuntimeState>) -> Result<DesktopWorkspaceState, String> {
    workspace_state(&state.registry_path)
}

#[tauri::command]
fn desktop_open_vault(
    path: String,
    name: Option<String>,
    state: State<DesktopRuntimeState>,
) -> Result<DesktopWorkspaceState, String> {
    let vault_path = Path::new(path.trim());
    if path.trim().is_empty() {
        return Err("vault path cannot be empty".to_string());
    }
    register_or_open_vault(&state.registry_path, vault_path, name.as_deref())
        .map_err(|error| format!("failed to open vault {}: {error}", vault_path.display()))?;
    workspace_state(&state.registry_path)
}

#[tauri::command]
fn desktop_switch_vault(
    vault_id: String,
    state: State<DesktopRuntimeState>,
) -> Result<DesktopWorkspaceState, String> {
    switch_active_vault(&state.registry_path, &vault_id)
        .map_err(|error| format!("failed to switch active vault {vault_id}: {error}"))?;
    workspace_state(&state.registry_path)
}

#[tauri::command]
fn desktop_create_note(
    vault_root: String,
    title: String,
    folder: Option<String>,
    body: Option<String>,
) -> Result<DesktopNoteSnapshot, String> {
    let vault_root_path = Path::new(&vault_root);
    let note_path =
        create_markdown_note(vault_root_path, folder.as_deref(), &title, body.as_deref()).map_err(
            |error| {
                format!(
                    "failed to create note in {}: {error}",
                    vault_root_path.display()
                )
            },
        )?;
    load_note_by_path(vault_root_path, &note_path)
}

#[tauri::command]
fn desktop_save_note(vault_root: String, note_path: String, content: String) -> Result<(), String> {
    let vault_root_path = Path::new(&vault_root);
    let normalized = normalize_relative_path(&note_path);
    let full_path = vault_root_path.join(&normalized);
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            format!(
                "failed to ensure note directory {}: {error}",
                parent.display()
            )
        })?;
    }
    fs::write(&full_path, content)
        .map_err(|error| format!("failed to save note {}: {error}", full_path.display()))
}

#[tauri::command]
fn desktop_capture_append(
    vault_root: String,
    target: String,
    text: String,
    note_path: Option<String>,
    daily_folder: Option<String>,
    daily_pattern: Option<String>,
    daily_heading: Option<String>,
) -> Result<DesktopCaptureResponse, String> {
    let vault_root_path = Path::new(&vault_root);
    let capture_target = decode_capture_target(&target)?;
    let daily_config = daily_config_from_options(daily_folder, daily_pattern, daily_heading);
    let result = append_capture(
        vault_root_path,
        capture_target,
        &text,
        note_path.as_deref(),
        Some(&daily_config),
    )
    .map_err(|error| {
        format!(
            "failed to append capture in {}: {error}",
            vault_root_path.display()
        )
    })?;
    let note = load_note_by_path(vault_root_path, &result.note_path)?;
    Ok(DesktopCaptureResponse { result, note })
}

#[tauri::command]
fn desktop_open_daily_note(
    vault_root: String,
    daily_folder: Option<String>,
    daily_pattern: Option<String>,
    daily_heading: Option<String>,
) -> Result<DesktopNoteSnapshot, String> {
    let vault_root_path = Path::new(&vault_root);
    let daily_config = daily_config_from_options(daily_folder, daily_pattern, daily_heading);
    let (note_path, _) =
        ensure_daily_note(vault_root_path, &daily_config, None).map_err(|error| {
            format!(
                "failed to open daily note in {}: {error}",
                vault_root_path.display()
            )
        })?;
    load_note_by_path(vault_root_path, &note_path)
}

fn main() {
    let state = DesktopRuntimeState {
        registry_path: default_registry_path(),
    };

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            desktop_bootstrap,
            desktop_open_vault,
            desktop_switch_vault,
            desktop_create_note,
            desktop_save_note,
            desktop_capture_append,
            desktop_open_daily_note
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Thoughtforge desktop app");
}
