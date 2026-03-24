use std::collections::{BTreeMap, BTreeSet, HashMap};
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Serialize, de::DeserializeOwned};
use tf_domain::{
    IndexedNote, NoteIdentityRecord, RequirementExecution, Status, VaultFileChange,
    VaultFileChangeKind, VaultFileSnapshot, VaultIndex, VaultNoteIdentityState, VaultRegistration,
    VaultScanSnapshot, WorkspaceRegistry,
};

const META_DIR_NAME: &str = ".thoughtforge";
const IDENTITY_STATE_FILE: &str = "note_identities.json";
const DEFAULT_INBOX_FILE: &str = "00 Inbox/Inbox.md";

pub trait ExecutionStore {
    fn upsert(&mut self, item: RequirementExecution);
    fn list(&self) -> Vec<RequirementExecution>;
    fn update_status(&mut self, requirement_id: &str, status: Status) -> bool;
}

#[derive(Default)]
pub struct InMemoryExecutionStore {
    by_id: HashMap<String, RequirementExecution>,
}

impl ExecutionStore for InMemoryExecutionStore {
    fn upsert(&mut self, item: RequirementExecution) {
        self.by_id.insert(item.requirement.id.clone(), item);
    }

    fn list(&self) -> Vec<RequirementExecution> {
        let mut values = self.by_id.values().cloned().collect::<Vec<_>>();
        values.sort_by(|a, b| a.requirement.id.cmp(&b.requirement.id));
        values
    }

    fn update_status(&mut self, requirement_id: &str, status: Status) -> bool {
        if let Some(item) = self.by_id.get_mut(requirement_id) {
            item.status = status;
            return true;
        }
        false
    }
}

pub fn thoughtforge_metadata_dir(vault_root: &Path) -> PathBuf {
    vault_root.join(META_DIR_NAME)
}

pub fn create_vault(vault_root: &Path) -> io::Result<()> {
    fs::create_dir_all(vault_root)?;
    fs::create_dir_all(thoughtforge_metadata_dir(vault_root))?;

    let inbox_path = vault_root.join(DEFAULT_INBOX_FILE);
    if !inbox_path.exists() {
        if let Some(parent) = inbox_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(inbox_path, "# Inbox\n\n")?;
    }

    Ok(())
}

pub fn load_workspace_registry(registry_path: &Path) -> io::Result<WorkspaceRegistry> {
    if !registry_path.exists() {
        return Ok(empty_registry());
    }
    read_json_file(registry_path)
}

pub fn save_workspace_registry(
    registry_path: &Path,
    registry: &WorkspaceRegistry,
) -> io::Result<()> {
    write_json_file(registry_path, registry)
}

pub fn register_or_open_vault(
    registry_path: &Path,
    vault_root: &Path,
    requested_name: Option<&str>,
) -> io::Result<WorkspaceRegistry> {
    create_vault(vault_root)?;
    let canonical_root = canonicalize_lossy(vault_root)?;
    let canonical_root_str = canonical_root.to_string_lossy().to_string();

    let mut registry = load_workspace_registry(registry_path)?;
    let opened_at = unix_timestamp_seconds();

    if let Some(existing) = registry
        .vaults
        .iter_mut()
        .find(|vault| vault.root_path == canonical_root_str)
    {
        existing.last_opened_at = opened_at;
        registry.active_vault_id = Some(existing.id.clone());
        save_workspace_registry(registry_path, &registry)?;
        return Ok(registry);
    }

    let name = requested_name
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .or_else(|| {
            canonical_root
                .file_name()
                .and_then(|value| value.to_str())
                .map(ToOwned::to_owned)
        })
        .unwrap_or_else(|| "Thoughtforge Vault".to_string());

    let registration = VaultRegistration {
        id: generate_stableish_id("vault", &canonical_root_str),
        name,
        root_path: canonical_root_str,
        last_opened_at: opened_at,
    };
    registry.active_vault_id = Some(registration.id.clone());
    registry.vaults.push(registration);
    registry
        .vaults
        .sort_by(|left, right| left.name.cmp(&right.name));

    save_workspace_registry(registry_path, &registry)?;
    Ok(registry)
}

pub fn switch_active_vault(registry_path: &Path, vault_id: &str) -> io::Result<WorkspaceRegistry> {
    let mut registry = load_workspace_registry(registry_path)?;
    let Some(target) = registry
        .vaults
        .iter_mut()
        .find(|vault| vault.id == vault_id)
    else {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("vault id not found: {vault_id}"),
        ));
    };

    target.last_opened_at = unix_timestamp_seconds();
    registry.active_vault_id = Some(target.id.clone());
    save_workspace_registry(registry_path, &registry)?;
    Ok(registry)
}

pub fn create_markdown_note(
    vault_root: &Path,
    folder: Option<&str>,
    title: &str,
    body: Option<&str>,
) -> io::Result<String> {
    let trimmed_title = title.trim();
    if trimmed_title.is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "note title cannot be empty",
        ));
    }

    let folder = folder.unwrap_or("00 Inbox").trim();
    let file_name = slug(trimmed_title);
    let relative_path = format!("{folder}/{file_name}.md");
    let full_path = vault_root.join(&relative_path);
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = match body {
        Some(value) if !value.trim().is_empty() => format!("# {trimmed_title}\n\n{value}\n"),
        _ => format!("# {trimmed_title}\n\n"),
    };
    fs::write(full_path, content)?;
    Ok(relative_path)
}

pub fn append_to_note(vault_root: &Path, note_path: &str, appended_text: &str) -> io::Result<()> {
    let full_path = vault_root.join(note_path);
    let mut file = fs::OpenOptions::new()
        .append(true)
        .create(false)
        .open(full_path)?;
    if !appended_text.starts_with('\n') {
        file.write_all(b"\n")?;
    }
    file.write_all(appended_text.as_bytes())?;
    if !appended_text.ends_with('\n') {
        file.write_all(b"\n")?;
    }
    Ok(())
}

pub fn index_vault_markdown(root: &Path) -> io::Result<VaultIndex> {
    create_vault(root)?;

    let mut files = Vec::new();
    collect_markdown_files(root, &mut files)?;
    files.sort();

    let mut state = load_note_identity_state(root)?;
    let mut by_path = HashMap::new();
    let mut by_fingerprint = HashMap::new();
    for record in &state.records {
        by_path.insert(normalize_link(&record.path), record.note_id.clone());
        by_fingerprint.insert(record.fingerprint.clone(), record.note_id.clone());
    }

    let mut notes = Vec::new();
    let mut new_records = Vec::new();
    for path in files {
        let relative = path
            .strip_prefix(root)
            .map_err(|error| io::Error::other(format!("path outside vault root: {error}")))?;
        let relative_path = normalize_separators(relative);
        let content = fs::read_to_string(&path)?;
        let metadata = fs::metadata(&path)?;
        let updated_at = metadata
            .modified()
            .ok()
            .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
            .map(|value| value.as_secs());
        let fingerprint = fingerprint_markdown(&content);
        let normalized_path = normalize_link(&relative_path);
        let note_id = by_path
            .get(&normalized_path)
            .cloned()
            .or_else(|| by_fingerprint.get(&fingerprint).cloned())
            .unwrap_or_else(|| {
                generate_stableish_id("note", &format!("{relative_path}:{fingerprint}"))
            });

        new_records.push(NoteIdentityRecord {
            note_id: note_id.clone(),
            path: relative_path.clone(),
            fingerprint: fingerprint.clone(),
        });

        notes.push(IndexedNote {
            id: note_id,
            path: relative_path.clone(),
            title: extract_title(&content, &relative_path),
            tags: extract_tags(&content),
            links: extract_links(&content),
            updated_at,
        });
    }

    state.records = new_records;
    save_note_identity_state(root, &state)?;

    let backlinks = build_backlinks(&notes);
    Ok(VaultIndex {
        vault_root: root.to_string_lossy().to_string(),
        notes,
        backlinks,
    })
}

pub fn backlinks_for_note(index: &VaultIndex, note_ref: &str) -> Vec<String> {
    let normalized_ref = normalize_link(note_ref);
    let mut alias_to_id = HashMap::new();
    for note in &index.notes {
        for alias in note_aliases(note) {
            alias_to_id.insert(alias, note.id.clone());
        }
    }

    let Some(target_id) = alias_to_id.get(&normalized_ref) else {
        return Vec::new();
    };

    index
        .backlinks
        .iter()
        .find(|(id, _)| id == target_id)
        .map(|(_, sources)| sources.clone())
        .unwrap_or_default()
}

pub fn snapshot_vault_files(root: &Path) -> io::Result<VaultScanSnapshot> {
    create_vault(root)?;
    let mut files = Vec::new();
    collect_all_vault_files(root, &mut files)?;
    files.sort();

    let mut snapshots = Vec::new();
    for path in files {
        let relative = path
            .strip_prefix(root)
            .map_err(|error| io::Error::other(format!("path outside vault root: {error}")))?;
        let relative_path = normalize_separators(relative);
        let metadata = fs::metadata(&path)?;
        let bytes = metadata.len();
        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
            .map(|value| value.as_secs());
        let raw = fs::read(&path)?;
        let fingerprint = fingerprint_bytes(&raw);

        snapshots.push(VaultFileSnapshot {
            path: relative_path,
            bytes,
            modified_at,
            fingerprint,
        });
    }

    Ok(VaultScanSnapshot {
        vault_root: root.to_string_lossy().to_string(),
        scanned_at: unix_timestamp_seconds(),
        files: snapshots,
    })
}

pub fn diff_snapshots(
    before: &VaultScanSnapshot,
    after: &VaultScanSnapshot,
) -> Vec<VaultFileChange> {
    let before_map = before
        .files
        .iter()
        .map(|file| (file.path.clone(), file))
        .collect::<HashMap<_, _>>();
    let after_map = after
        .files
        .iter()
        .map(|file| (file.path.clone(), file))
        .collect::<HashMap<_, _>>();

    let mut added_paths = after_map
        .keys()
        .filter(|path| !before_map.contains_key(*path))
        .cloned()
        .collect::<BTreeSet<_>>();
    let mut deleted_paths = before_map
        .keys()
        .filter(|path| !after_map.contains_key(*path))
        .cloned()
        .collect::<BTreeSet<_>>();

    let mut changes = Vec::new();
    for (path, after_file) in &after_map {
        if let Some(before_file) = before_map.get(path)
            && before_file.fingerprint != after_file.fingerprint
        {
            changes.push(VaultFileChange {
                kind: VaultFileChangeKind::Modified,
                path: path.clone(),
                previous_path: None,
                reason: "content fingerprint changed".to_string(),
            });
        }
    }

    let added_clone = added_paths.iter().cloned().collect::<Vec<_>>();
    for added in added_clone {
        let Some(added_file) = after_map.get(&added) else {
            continue;
        };
        let rename_source = deleted_paths.iter().find_map(|candidate| {
            let candidate_file = before_map.get(candidate)?;
            if candidate_file.fingerprint == added_file.fingerprint
                && candidate_file.bytes == added_file.bytes
            {
                Some(candidate.clone())
            } else {
                None
            }
        });

        if let Some(previous_path) = rename_source {
            changes.push(VaultFileChange {
                kind: VaultFileChangeKind::Renamed,
                path: added.clone(),
                previous_path: Some(previous_path.clone()),
                reason: "same fingerprint and size at new path".to_string(),
            });
            added_paths.remove(&added);
            deleted_paths.remove(&previous_path);
        }
    }

    for path in added_paths {
        changes.push(VaultFileChange {
            kind: VaultFileChangeKind::Added,
            path,
            previous_path: None,
            reason: "new file path detected".to_string(),
        });
    }

    for path in deleted_paths {
        changes.push(VaultFileChange {
            kind: VaultFileChangeKind::Deleted,
            path,
            previous_path: None,
            reason: "file path no longer exists".to_string(),
        });
    }

    changes.sort_by(|left, right| left.path.cmp(&right.path));
    changes
}

fn collect_markdown_files(root: &Path, output: &mut Vec<PathBuf>) -> io::Result<()> {
    if !root.exists() {
        return Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("vault root does not exist: {}", root.display()),
        ));
    }

    for entry in fs::read_dir(root)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            let is_meta_dir = path
                .file_name()
                .and_then(|value| value.to_str())
                .map(|value| value == META_DIR_NAME)
                .unwrap_or(false);
            if is_meta_dir {
                continue;
            }
            collect_markdown_files(&path, output)?;
            continue;
        }

        let is_markdown = path
            .extension()
            .and_then(|value| value.to_str())
            .map(|value| value.eq_ignore_ascii_case("md"))
            .unwrap_or(false);
        if is_markdown {
            output.push(path);
        }
    }

    Ok(())
}

fn collect_all_vault_files(root: &Path, output: &mut Vec<PathBuf>) -> io::Result<()> {
    for entry in fs::read_dir(root)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            let is_meta_dir = path
                .file_name()
                .and_then(|value| value.to_str())
                .map(|value| value == META_DIR_NAME)
                .unwrap_or(false);
            if is_meta_dir {
                continue;
            }
            collect_all_vault_files(&path, output)?;
            continue;
        }
        output.push(path);
    }
    Ok(())
}

fn load_note_identity_state(vault_root: &Path) -> io::Result<VaultNoteIdentityState> {
    let path = thoughtforge_metadata_dir(vault_root).join(IDENTITY_STATE_FILE);
    if !path.exists() {
        return Ok(VaultNoteIdentityState {
            version: 1,
            records: Vec::new(),
        });
    }
    read_json_file(&path)
}

fn save_note_identity_state(vault_root: &Path, state: &VaultNoteIdentityState) -> io::Result<()> {
    let path = thoughtforge_metadata_dir(vault_root).join(IDENTITY_STATE_FILE);
    write_json_file(&path, state)
}

fn normalize_separators(path: &Path) -> String {
    path.components()
        .map(|component| component.as_os_str().to_string_lossy().to_string())
        .collect::<Vec<_>>()
        .join("/")
}

fn extract_title(content: &str, relative_path: &str) -> String {
    if let Some(heading) = content
        .lines()
        .find_map(|line| line.strip_prefix("# ").map(str::trim))
    {
        let heading = heading.trim();
        if !heading.is_empty() {
            return heading.to_string();
        }
    }

    Path::new(relative_path)
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("Untitled")
        .to_string()
}

fn extract_tags(content: &str) -> Vec<String> {
    let mut tags = BTreeSet::new();
    for token in content.split_whitespace() {
        if !token.starts_with('#') || token.len() < 2 {
            continue;
        }
        if token.starts_with("##") {
            continue;
        }
        let cleaned = token
            .trim_matches(|ch: char| {
                !(ch.is_ascii_alphanumeric() || ch == '#' || ch == '-' || ch == '_')
            })
            .trim();
        if cleaned.len() > 1 {
            tags.insert(cleaned.to_string());
        }
    }
    tags.into_iter().collect()
}

fn extract_links(content: &str) -> Vec<String> {
    let mut links = BTreeSet::new();
    links.extend(extract_wikilinks(content));
    links.extend(extract_markdown_links(content));
    links.into_iter().collect()
}

fn extract_wikilinks(content: &str) -> Vec<String> {
    let mut links = Vec::new();
    let mut cursor = 0usize;
    while let Some(start) = content[cursor..].find("[[") {
        let start_idx = cursor + start + 2;
        let Some(end_rel) = content[start_idx..].find("]]") else {
            break;
        };
        let raw = &content[start_idx..start_idx + end_rel];
        let link = normalize_link(raw);
        if !link.is_empty() {
            links.push(link);
        }
        cursor = start_idx + end_rel + 2;
    }
    links
}

fn extract_markdown_links(content: &str) -> Vec<String> {
    let mut links = Vec::new();
    let mut cursor = 0usize;
    while let Some(open) = content[cursor..].find("](") {
        let target_start = cursor + open + 2;
        let Some(close_rel) = content[target_start..].find(')') else {
            break;
        };
        let raw = &content[target_start..target_start + close_rel];
        let raw = raw.trim();
        if raw.starts_with("http://")
            || raw.starts_with("https://")
            || raw.starts_with("mailto:")
            || raw.starts_with("obsidian://")
            || raw.starts_with("thoughtforge://")
        {
            cursor = target_start + close_rel + 1;
            continue;
        }
        let link = normalize_link(raw);
        if !link.is_empty() {
            links.push(link);
        }
        cursor = target_start + close_rel + 1;
    }
    links
}

fn normalize_link(raw: &str) -> String {
    let before_alias = raw.split('|').next().unwrap_or(raw);
    let without_anchor = before_alias.split('#').next().unwrap_or(before_alias);
    without_anchor
        .trim()
        .trim_start_matches("./")
        .trim_end_matches(".md")
        .to_ascii_lowercase()
}

fn note_aliases(note: &IndexedNote) -> Vec<String> {
    let mut aliases = BTreeSet::new();
    aliases.insert(normalize_link(&note.path));
    aliases.insert(normalize_link(&note.title));
    if let Some(stem) = Path::new(&note.path)
        .file_stem()
        .and_then(|value| value.to_str())
    {
        aliases.insert(normalize_link(stem));
    }
    aliases.into_iter().collect()
}

fn build_backlinks(notes: &[IndexedNote]) -> Vec<(String, Vec<String>)> {
    let mut alias_to_id = HashMap::new();
    for note in notes {
        for alias in note_aliases(note) {
            alias_to_id.insert(alias, note.id.clone());
        }
    }

    let mut by_target: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    for note in notes {
        for link in &note.links {
            if let Some(target_id) = alias_to_id.get(link) {
                by_target
                    .entry(target_id.clone())
                    .or_default()
                    .insert(note.id.clone());
            }
        }
    }

    notes
        .iter()
        .map(|note| {
            let sources = by_target
                .get(&note.id)
                .map(|values| values.iter().cloned().collect::<Vec<_>>())
                .unwrap_or_default();
            (note.id.clone(), sources)
        })
        .collect()
}

fn empty_registry() -> WorkspaceRegistry {
    WorkspaceRegistry {
        active_vault_id: None,
        vaults: Vec::new(),
    }
}

fn read_json_file<T>(path: &Path) -> io::Result<T>
where
    T: DeserializeOwned,
{
    let raw = fs::read_to_string(path)?;
    serde_json::from_str(&raw).map_err(|error| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            format!("failed to parse json {}: {error}", path.display()),
        )
    })
}

fn write_json_file<T>(path: &Path, value: &T) -> io::Result<()>
where
    T: Serialize,
{
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let raw = serde_json::to_string_pretty(value)
        .map_err(|error| io::Error::other(format!("json serialization failed: {error}")))?;
    fs::write(path, raw)?;
    Ok(())
}

fn canonicalize_lossy(path: &Path) -> io::Result<PathBuf> {
    if path.exists() {
        fs::canonicalize(path)
    } else {
        Ok(path.to_path_buf())
    }
}

fn unix_timestamp_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_secs())
        .unwrap_or(0)
}

fn generate_stableish_id(prefix: &str, seed: &str) -> String {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    seed.hash(&mut hasher);
    unix_timestamp_seconds().hash(&mut hasher);
    format!("{prefix}:{:016x}", hasher.finish())
}

fn fingerprint_markdown(content: &str) -> String {
    fingerprint_bytes(content.as_bytes())
}

fn fingerprint_bytes(bytes: &[u8]) -> String {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    bytes.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

fn slug(value: &str) -> String {
    let normalized = value
        .trim()
        .to_ascii_lowercase()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '-' })
        .collect::<String>();

    let collapsed = normalized
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-");

    if collapsed.is_empty() {
        "note".to_string()
    } else {
        collapsed
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::time::{SystemTime, UNIX_EPOCH};
    use tf_domain::{Priority, Requirement};

    fn test_dir(prefix: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("{prefix}-{suffix}"))
    }

    #[test]
    fn updates_status_when_requirement_exists() {
        let mut store = InMemoryExecutionStore::default();
        store.upsert(RequirementExecution {
            requirement: Requirement {
                id: "FR-WV-001".to_string(),
                priority: Priority::Must,
                summary: "Vault management".to_string(),
            },
            status: Status::Todo,
            milestone: "M1".to_string(),
        });

        assert!(store.update_status("FR-WV-001", Status::InProgress));
        assert_eq!(store.list()[0].status, Status::InProgress);
    }

    #[test]
    fn indexes_vault_notes_and_backlinks() {
        let vault = test_dir("thoughtforge-vault-index");
        fs::create_dir_all(vault.join("projects")).expect("create vault dirs");
        fs::write(
            vault.join("inbox.md"),
            "# Inbox\nLink to [[projects/alpha]] and #capture",
        )
        .expect("write inbox");
        fs::write(
            vault.join("projects").join("alpha.md"),
            "# Alpha\nRelated to [Inbox](../inbox.md)",
        )
        .expect("write alpha");

        let index = index_vault_markdown(&vault).expect("index vault");
        assert!(
            index.notes.len() >= 2,
            "should index created notes alongside default inbox"
        );
        assert!(index.notes.iter().any(|note| note.title == "Inbox"));

        let backlinks = backlinks_for_note(&index, "alpha");
        let note_paths_by_id = index
            .notes
            .iter()
            .map(|note| (note.id.clone(), note.path.clone()))
            .collect::<HashMap<_, _>>();
        assert!(
            backlinks
                .iter()
                .filter_map(|id| note_paths_by_id.get(id))
                .any(|path| path.ends_with("inbox.md")),
            "alpha note should have backlink from inbox"
        );
    }

    #[test]
    fn preserves_note_id_across_rename_by_fingerprint() {
        let vault = test_dir("thoughtforge-vault-rename");
        fs::create_dir_all(vault.join("docs")).expect("create docs folder");
        let old_path = vault.join("docs").join("alpha.md");
        let new_path = vault.join("docs").join("beta.md");
        fs::write(&old_path, "# Alpha\n\nShared content").expect("write alpha");

        let first = index_vault_markdown(&vault).expect("first index");
        let first_id = first
            .notes
            .iter()
            .find(|note| note.path.ends_with("alpha.md"))
            .map(|note| note.id.clone())
            .expect("alpha note id");

        fs::rename(&old_path, &new_path).expect("rename note");

        let second = index_vault_markdown(&vault).expect("second index");
        let second_id = second
            .notes
            .iter()
            .find(|note| note.path.ends_with("beta.md"))
            .map(|note| note.id.clone())
            .expect("beta note id");

        assert_eq!(first_id, second_id, "note id should remain stable");
    }

    #[test]
    fn registers_and_switches_vaults_in_registry() {
        let root = test_dir("thoughtforge-registry");
        let vault_a = root.join("vault-a");
        let vault_b = root.join("vault-b");
        let registry_path = root.join("workspace_registry.json");

        let registry = register_or_open_vault(&registry_path, &vault_a, Some("Vault A"))
            .expect("register vault a");
        assert_eq!(registry.vaults.len(), 1);

        let registry = register_or_open_vault(&registry_path, &vault_b, Some("Vault B"))
            .expect("register vault b");
        assert_eq!(registry.vaults.len(), 2);
        let vault_b_id = registry
            .vaults
            .iter()
            .find(|vault| vault.name == "Vault B")
            .map(|vault| vault.id.clone())
            .expect("vault b id");

        let switched =
            switch_active_vault(&registry_path, &vault_b_id).expect("switch active vault");
        assert_eq!(
            switched.active_vault_id.as_deref(),
            Some(vault_b_id.as_str())
        );
    }

    #[test]
    fn detects_renamed_file_between_snapshots() {
        let vault = test_dir("thoughtforge-vault-diff");
        fs::create_dir_all(&vault).expect("create vault");
        let old_path = vault.join("note-a.md");
        let new_path = vault.join("note-b.md");
        fs::write(&old_path, "# Note\n\nsame content").expect("write note");

        let before = snapshot_vault_files(&vault).expect("snapshot before");
        fs::rename(&old_path, &new_path).expect("rename note");
        let after = snapshot_vault_files(&vault).expect("snapshot after");

        let changes = diff_snapshots(&before, &after);
        assert!(
            changes
                .iter()
                .any(|change| change.kind == VaultFileChangeKind::Renamed),
            "should detect rename"
        );
    }
}
