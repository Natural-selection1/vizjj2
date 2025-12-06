use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
pub struct Commit {
    pub change_id: String,
    pub commit_id: String,
    pub author_email: String,
    pub timestamp: String,
    pub parents: Vec<String>,
    pub is_immutable: bool,
    pub is_conflict: bool,
    pub description: String,
    pub bookmarks: String,
    pub tags: String,
    pub is_working_copy: bool,
}
