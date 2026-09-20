use crate::ai;
use crate::settings::{AppConfig, Settings};
use crate::store::{Memo, MemoStore, Todo};
use chrono::Utc;
use log::warn;
use tauri::State;
use uuid::Uuid;

#[derive(serde::Serialize)]
pub struct ProcessResult {
    tags: Vec<String>,
    category: String,
    path: String,
    source: String, // "ai" or "fallback"
}

fn detect_content_type(content: &str) -> &str {
    let trimmed = content.trim();
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        "link"
    } else if trimmed.starts_with("data:image") || trimmed.len() > 1000 && !trimmed.contains(char::is_whitespace) {
        "image"
    } else {
        "text"
    }
}

#[tauri::command]
pub async fn process_memo(
    content: String,
    description: Option<String>,
    store: State<'_, MemoStore>,
    settings: State<'_, Settings>,
) -> Result<ProcessResult, String> {
    let config = settings.get();
    let content_type = detect_content_type(&content);

    // Process based on content type
    let (analysis, mut final_content) = if content_type == "link" {
        // Fetch title for links
        let title = ai::fetch_title(content.trim()).await;
        let display = match title {
            Some(t) => format!("[{}]({})", t, content.trim()),
            None => content.clone(),
        };
        let desc_with_link = match &description {
            Some(d) => format!("{}\n{}", d, content.trim()),
            None => content.clone(),
        };
        if config.api_key.is_empty() {
            (ai::fallback_analysis(&content), display)
        } else {
            match ai::analyze_text(&desc_with_link, description.as_deref(), &config).await {
                Ok(a) => (a, display),
                Err(e) => {
                    warn!("链接 AI 分析失败（{}），fallback", e);
                    (ai::fallback_analysis(&content), display)
                }
            }
        }
    } else if content_type == "image" {
        // Image: extract base64 data
        let b64 = if content.starts_with("data:image") {
            content.split(',').nth(1).unwrap_or(&content).to_string()
        } else {
            content.clone()
        };
        if config.api_key.is_empty() {
            (ai::fallback_analysis("[图片]"), "[图片]".to_string())
        } else {
            match ai::analyze_image(&b64, description.as_deref(), &config).await {
                Ok(a) => (a, "[图片]".to_string()),
                Err(e) => {
                    warn!("图片 AI 分析失败（{}），fallback", e);
                    (ai::fallback_analysis(&content), "[图片]".to_string())
                }
            }
        }
    } else {
        // Text
        if config.api_key.is_empty() {
            (ai::fallback_analysis(&content), content.clone())
        } else {
            match ai::analyze_text(&content, description.as_deref(), &config).await {
                Ok(a) => (a, content.clone()),
                Err(e) => {
                    warn!("文字 AI 分析失败（{}），fallback", e);
                    (ai::fallback_analysis(&content), content.clone())
                }
            }
        }
    };

    let source = if config.api_key.is_empty() { "fallback" } else { "ai" };

    // Determine target directory
    let vault_path = &config.obsidian_vault;
    if vault_path.is_empty() {
        // No Obsidian vault configured — skip file write, just store in memory
        let title: String = final_content.chars().take(50).collect();
        let memo = Memo {
            id: Uuid::new_v4().to_string(),
            content: final_content,
            description,
            tags: analysis.tags.clone(),
            category: analysis.category.clone(),
            created_at: Utc::now().to_rfc3339(),
            source_path: None,
            image_data: if content_type == "image" {
                let b64 = if content.starts_with("data:image") {
                    content.split(',').nth(1).unwrap_or(&content).to_string()
                } else {
                    content.clone()
                };
                Some(b64)
            } else {
                None
            },
        };
        store.add_memo(memo);
        if analysis.is_todo {
            let todo = Todo {
                id: Uuid::new_v4().to_string(),
                content: analysis.todo_content.unwrap_or_else(|| title.clone()),
                due_date: analysis.due_date,
                completed: false,
                created_at: Utc::now().to_rfc3339(),
                memo_id: None,
            };
            store.add_todo(todo);
        }
        return Ok(ProcessResult {
            tags: analysis.tags,
            category: analysis.category,
            path: String::new(),
            source: source.to_string(),
        });
    }

    let target_dir = if analysis.category == "未分类" || (analysis.tags.len() == 1 && analysis.tags[0] == "笔记") {
        "0-Inbox"
    } else {
        match analysis.category.as_str() {
            "技术" | "学习" | "编程" => "3-Resources",
            "工作" | "项目" => "1-Projects",
            "生活" | "健康" | "财务" => "2-Areas",
            "灵感" | "想法" | "创意" => "4-Permanent",
            _ => "0-Inbox",
        }
    };

    let memo_dir = std::path::Path::new(vault_path).join("MemoHub").join(target_dir);
    let _ = std::fs::create_dir_all(&memo_dir);

    let filename = format!("{}-{}.md", Utc::now().format("%Y%m%d-%H%M%S"), Uuid::new_v4());
    let filepath = memo_dir.join(&filename);

    // Build markdown
    let title: String = final_content.chars().take(50).collect();
    let mut md = String::new();
    md.push_str(&format!("# {}\n\n", title));
    md.push_str(&format!("**内容**：{}\n\n", final_content));
    if let Some(desc) = &description {
        md.push_str(&format!("**描述**：{}\n\n", desc));
    }
    md.push_str(&format!("**分类**：{}\n\n", analysis.category));
    md.push_str(&format!(
        "**标签**：{}\n\n",
        analysis.tags.iter().map(|t| format!("#{}", t)).collect::<Vec<_>>().join(" ")
    ));
    md.push_str(&format!("**时间**：{}\n\n", Utc::now().format("%Y-%m-%d %H:%M:%S")));

    let _ = std::fs::write(&filepath, &md);

    let memo = Memo {
        id: Uuid::new_v4().to_string(),
        content: final_content,
        description,
        tags: analysis.tags.clone(),
        category: analysis.category.clone(),
        created_at: Utc::now().to_rfc3339(),
        source_path: Some(filepath.to_string_lossy().to_string()),
        image_data: if content_type == "image" {
            // Store a smaller version for thumbnail (strip prefix if present)
            let b64 = if content.starts_with("data:image") {
                content.split(',').nth(1).unwrap_or(&content).to_string()
            } else {
                content.clone()
            };
            Some(b64)
        } else {
            None
        },
    };
    store.add_memo(memo);

    // Auto-create todo if detected
    if analysis.is_todo {
        let todo = Todo {
            id: Uuid::new_v4().to_string(),
            content: analysis.todo_content.unwrap_or_else(|| title.clone()),
            due_date: analysis.due_date,
            completed: false,
            created_at: Utc::now().to_rfc3339(),
            memo_id: None,
        };
        store.add_todo(todo);
    }

    Ok(ProcessResult {
        tags: analysis.tags,
        category: analysis.category,
        path: filepath.to_string_lossy().to_string(),
        source: source.to_string(),
    })
}

#[tauri::command]
pub fn list_memos(store: State<'_, MemoStore>) -> Vec<Memo> {
    store.get_memos()
}

#[tauri::command]
pub fn list_todos(store: State<'_, MemoStore>) -> Vec<Todo> {
    store.get_todos()
}

#[tauri::command]
pub fn toggle_todo(id: String, store: State<'_, MemoStore>) -> bool {
    store.toggle_todo(&id)
}

#[tauri::command]
pub fn search_memos(query: String, store: State<'_, MemoStore>) -> Vec<Memo> {
    store.search_memos(&query)
}

#[tauri::command]
pub fn delete_memo(id: String, store: State<'_, MemoStore>) -> bool {
    // Get the memo's source_path before deleting so we can remove the markdown file
    let source_path = store.get_memos().into_iter().find(|m| m.id == id).and_then(|m| m.source_path);
    let deleted = store.delete_memo(&id);
    if deleted {
        if let Some(path) = source_path {
            let _ = std::fs::remove_file(&path);
        }
    }
    deleted
}

#[tauri::command]
pub fn clear_all_memos(store: State<'_, MemoStore>) {
    let paths: Vec<String> = store.get_memos().into_iter().filter_map(|m| m.source_path).collect();
    store.clear_all_memos();
    for path in paths {
        let _ = std::fs::remove_file(&path);
    }
}

#[tauri::command]
pub fn check_path_exists(path: String) -> bool {
    let p = std::path::Path::new(&path);
    // Must be a real Obsidian vault: directory + .obsidian subfolder
    p.exists() && p.is_dir() && p.join(".obsidian").is_dir()
}

#[tauri::command]
pub fn get_settings(settings: State<'_, Settings>) -> AppConfig {
    settings.get()
}

#[tauri::command]
pub fn save_settings(config: AppConfig, settings: State<'_, Settings>) -> Result<(), String> {
    settings.update(config);
    Ok(())
}

#[tauri::command]
pub fn check_api_key(settings: State<'_, Settings>) -> bool {
    !settings.get().api_key.is_empty()
}

#[tauri::command]
pub fn save_window_position(x: f64, y: f64, width: f64, height: f64, settings: State<'_, Settings>) {
    let mut config = settings.get();
    config.window_x = Some(x);
    config.window_y = Some(y);
    config.window_width = Some(width);
    config.window_height = Some(height);
    settings.update(config);
}

#[tauri::command]
pub fn init_obsidian_dirs(vault_path: String) -> Result<(), String> {
    let dirs = [
        "MemoHub/0-Inbox",
        "MemoHub/1-Projects",
        "MemoHub/2-Areas",
        "MemoHub/3-Resources",
        "MemoHub/4-Permanent",
        "MemoHub/5-MOCs",
        "MemoHub/6-Archives",
        "MemoHub/Templates",
    ];
    for dir in &dirs {
        let path = std::path::Path::new(&vault_path).join(dir);
        std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create {}: {}", dir, e))?;
    }
    // Create index file
    let index_path = std::path::Path::new(&vault_path).join("MemoHub").join("README.md");
    if !index_path.exists() {
        let content = "# MemoHub\n\n智能随手记工具自动管理的目录。\n\n- `0-Inbox/` — 待整理\n- `1-Projects/` — 项目相关\n- `2-Areas/` — 生活领域\n- `3-Resources/` — 资源收藏\n- `4-Permanent/` — 精炼笔记\n- `5-MOCs/` — 内容地图\n- `6-Archives/` — 归档\n- `Templates/` — 模板\n";
        let _ = std::fs::write(index_path, content);
    }
    Ok(())
}
