use std::collections::HashMap;

use tf_domain::{RequirementExecution, Status};

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

#[cfg(test)]
mod tests {
    use super::*;
    use tf_domain::{Priority, Requirement};

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
}
