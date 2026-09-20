use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Memo {
    pub id: String,
    pub content: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub category: String,
    pub created_at: String,
    pub source_path: Option<String>,
    pub image_data: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    pub id: String,
    pub content: String,
    pub due_date: Option<String>,
    pub completed: bool,
    pub created_at: String,
    pub memo_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct StoreData {
    memos: Vec<Memo>,
    todos: Vec<Todo>,
    tags: Vec<String>,
}

pub struct MemoStore {
    data: Mutex<StoreData>,
    store_path: String,
}

impl MemoStore {
    pub fn new() -> Self {
        let store_path = dirs_next::data_local_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("MemoHub")
            .join("store.json");

        if let Some(parent) = store_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let data = if store_path.exists() {
            let content = std::fs::read_to_string(&store_path).unwrap_or_default();
            serde_json::from_str(&content).unwrap_or(StoreData {
                memos: Vec::new(),
                todos: Vec::new(),
                tags: Vec::new(),
            })
        } else {
            StoreData {
                memos: Vec::new(),
                todos: Vec::new(),
                tags: Vec::new(),
            }
        };

        Self {
            data: Mutex::new(data),
            store_path: store_path.to_string_lossy().to_string(),
        }
    }

    fn save(&self) {
        let data = self.data.lock().unwrap();
        if let Ok(json) = serde_json::to_string_pretty(&*data) {
            let _ = std::fs::write(&self.store_path, json);
        }
    }

    pub fn add_memo(&self, memo: Memo) {
        let mut data = self.data.lock().unwrap();
        for tag in &memo.tags {
            if !data.tags.contains(tag) {
                data.tags.push(tag.clone());
            }
        }
        data.memos.insert(0, memo);
        drop(data);
        self.save();
    }

    pub fn get_memos(&self) -> Vec<Memo> {
        let data = self.data.lock().unwrap();
        data.memos.clone()
    }

    pub fn add_todo(&self, todo: Todo) {
        let mut data = self.data.lock().unwrap();
        data.todos.insert(0, todo);
        drop(data);
        self.save();
    }

    pub fn get_todos(&self) -> Vec<Todo> {
        let data = self.data.lock().unwrap();
        data.todos.clone()
    }

    pub fn toggle_todo(&self, id: &str) -> bool {
        let mut data = self.data.lock().unwrap();
        if let Some(todo) = data.todos.iter_mut().find(|t| t.id == id) {
            todo.completed = !todo.completed;
            let completed = todo.completed;
            drop(data);
            self.save();
            completed
        } else {
            false
        }
    }

    pub fn search_memos(&self, query: &str) -> Vec<Memo> {
        let data = self.data.lock().unwrap();
        let query_lower = query.to_lowercase();
        data.memos
            .iter()
            .filter(|m| {
                m.content.to_lowercase().contains(&query_lower)
                    || m.description
                        .as_ref()
                        .map(|d| d.to_lowercase().contains(&query_lower))
                        .unwrap_or(false)
                    || m.tags.iter().any(|t| t.to_lowercase().contains(&query_lower))
                    || m.category.to_lowercase().contains(&query_lower)
            })
            .cloned()
            .collect()
    }

    pub fn delete_memo(&self, id: &str) -> bool {
        let mut data = self.data.lock().unwrap();
        let len_before = data.memos.len();
        data.memos.retain(|m| m.id != id);
        if data.memos.len() < len_before {
            drop(data);
            self.save();
            true
        } else {
            false
        }
    }

    pub fn clear_all_memos(&self) {
        let mut data = self.data.lock().unwrap();
        data.memos.clear();
        data.todos.clear();
        data.tags.clear();
        drop(data);
        self.save();
    }
}
