use crate::settings::AppConfig;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AIAnalysis {
    pub tags: Vec<String>,
    pub category: String,
    pub is_todo: bool,
    pub todo_content: Option<String>,
    pub due_date: Option<String>,
}

const SYSTEM_PROMPT: &str = r#"你是一个智能笔记整理助手。用户会给你一段内容（文字、图片描述、链接等），你需要：

1. 分析内容，生成合适的标签（tags），标签要简洁有意义
2. 判断内容属于什么分类（category），分类要自然合理，不要用固定分类
3. 判断是否包含待办事项/时间提醒

请用JSON格式回复：
{
  "tags": ["标签1", "标签2"],
  "category": "分类名",
  "is_todo": true/false,
  "todo_content": "如果有待办，提取待办内容",
  "due_date": "如果有时间，提取时间（ISO格式），否则null"
}

注意：
- 标签2-5个，简洁明了
- 分类要自然，比如"技术"、"生活"、"工作"、"灵感"、"资源"等
- 只分析内容，不要添加额外信息
- 如果内容太短或无意义（如一串数字），标签和分类可以简单一些"#;

pub async fn analyze_text(
    content: &str,
    description: Option<&str>,
    config: &AppConfig,
) -> Result<AIAnalysis, String> {
    if config.api_key.is_empty() {
        return Err("NO_API_KEY".to_string());
    }

    let user_msg = match description {
        Some(desc) => format!("内容：{}\n描述：{}", content, desc),
        None => format!("内容：{}", content),
    };

    call_ai(&config.api_base, &config.api_key, &config.text_model, &user_msg, None).await
}

pub async fn analyze_image(
    image_base64: &str,
    description: Option<&str>,
    config: &AppConfig,
) -> Result<AIAnalysis, String> {
    if config.api_key.is_empty() {
        return Err("NO_API_KEY".to_string());
    }

    let user_msg = match description {
        Some(desc) => format!("请分析这张图片的内容。描述：{}", desc),
        None => "请分析这张图片的内容。".to_string(),
    };

    let image_url = format!("data:image/png;base64,{}", image_base64);

    call_ai(&config.api_base, &config.api_key, &config.vision_model, &user_msg, Some(&image_url)).await
}

async fn call_ai(
    api_base: &str,
    api_key: &str,
    model: &str,
    user_msg: &str,
    image_url: Option<&str>,
) -> Result<AIAnalysis, String> {
    let client = reqwest::Client::new();

    let user_content = if let Some(url) = image_url {
        serde_json::json!([
            {"type": "text", "text": user_msg},
            {"type": "image_url", "image_url": {"url": url}}
        ])
    } else {
        serde_json::json!(user_msg)
    };

    let base = api_base.trim_end_matches('/');
    let resp = client
        .post(format!("{}/chat/completions", base))
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&serde_json::json!({
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.3,
            "response_format": {"type": "json_object"}
        }))
        .send()
        .await
        .map_err(|e| format!("API request failed: {}", e))?;

    let status = resp.status();
    if !status.is_success() {
        let error_text = resp.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status.as_u16(), error_text));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // Safely extract content, preventing panic on unexpected response structure
    let content_str = body
        .get("choices")
        .and_then(|c| c.as_array())
        .and_then(|arr| arr.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|msg| msg.get("content"))
        .and_then(|c| c.as_str())
        .unwrap_or("{}");

    serde_json::from_str::<AIAnalysis>(content_str)
        .map_err(|e| format!("Failed to parse AI response: {}", e))
}

pub async fn fetch_title(url: &str) -> Option<String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .redirect(reqwest::redirect::Policy::limited(3))
        .build()
        .ok()?;

    let resp = client.get(url).send().await.ok()?;
    let body = resp.text().await.ok()?;

    // More robust title extraction: handles <title >, <TITLE>, attributes, etc.
    let lower = body.to_lowercase();
    
    // Find opening title tag with possible attributes
    let open_tag = match lower.find("<title") {
        Some(pos) => pos,
        None => return None,
    };
    
    // Find the > after <title
    let after_open = &lower[open_tag..];
    let content_start = match after_open.find('>') {
        Some(pos) => open_tag + pos + 1,
        None => return None,
    };
    
    // Find closing </title>
    let content_end = match lower[content_start..].find("</title>") {
        Some(pos) => content_start + pos,
        None => return None,
    };
    
    if content_end > content_start {
        let title = body[content_start..content_end].trim();
        if !title.is_empty() {
            return Some(title.to_string());
        }
    }
    None
}

pub fn fallback_analysis(content: &str) -> AIAnalysis {
    let content_lower = content.to_lowercase();
    let mut tags = Vec::new();
    let mut category = "未分类".to_string();

    if content_lower.contains("http") || content_lower.contains("www") {
        tags.push("链接".to_string());
        category = "资源".to_string();
    } else if content_lower.contains("学") || content_lower.contains("教程") || content_lower.contains("代码") {
        tags.push("学习".to_string());
        category = "技术".to_string();
    } else if content_lower.contains("买") || content_lower.contains("购物") || content_lower.contains("价格") {
        tags.push("购物".to_string());
        category = "生活".to_string();
    }

    if tags.is_empty() {
        tags.push("笔记".to_string());
    }

    AIAnalysis {
        tags,
        category,
        is_todo: false,
        todo_content: None,
        due_date: None,
    }
}
