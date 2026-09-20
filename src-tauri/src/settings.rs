use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub api_base: String,
    pub api_key: String,
    pub text_model: String,
    pub vision_model: String,
    pub obsidian_vault: String,
    pub onboarding_done: bool,
    #[serde(default)]
    pub window_x: Option<f64>,
    #[serde(default)]
    pub window_y: Option<f64>,
    #[serde(default)]
    pub window_width: Option<f64>,
    #[serde(default)]
    pub window_height: Option<f64>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            api_base: "https://api.siliconflow.cn/v1".to_string(),
            api_key: String::new(),
            text_model: "Qwen/Qwen2.5-7B-Instruct".to_string(),
            vision_model: "Qwen/Qwen2.5-VL-7B-Instruct".to_string(),
            obsidian_vault: String::new(),
            onboarding_done: false,
            window_x: None,
            window_y: None,
            window_width: None,
            window_height: None,
        }
    }
}

pub struct Settings {
    data: Mutex<AppConfig>,
    path: String,
}

impl Settings {
    pub fn new() -> Self {
        let dir = dirs_next::data_local_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("MemoHub");
        let _ = std::fs::create_dir_all(&dir);
        let path = dir.join("config.json");

        let data = if path.exists() {
            let content = std::fs::read_to_string(&path).unwrap_or_default();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            AppConfig::default()
        };

        Self {
            data: Mutex::new(data),
            path: path.to_string_lossy().to_string(),
        }
    }

    pub fn get(&self) -> AppConfig {
        self.data.lock().unwrap().clone()
    }

    pub fn update(&self, config: AppConfig) {
        let mut data = self.data.lock().unwrap();
        *data = config;
        if let Ok(json) = serde_json::to_string_pretty(&*data) {
            let _ = std::fs::write(&self.path, json);
        }
    }
}
