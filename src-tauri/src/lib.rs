// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod commands;
mod settings;
mod store;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            // Tray menu
            let show = MenuItem::with_id(app, "show", "显示 MemoHub", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            // Tray icon
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Initialize stores & read saved config
            app.manage(store::MemoStore::new());
            app.manage(settings::Settings::new());
            let saved_cfg = app.state::<settings::Settings>().get();

            // Auto-size & position the window
            if let Some(window) = app.get_webview_window("main") {
                use tauri::LogicalSize;
                use tauri::LogicalPosition;
                use tauri::Size;

                // Get primary monitor size
                let monitor_size = window.current_monitor().ok().flatten().map(|m| m.size().to_logical(m.scale_factor()));
                let (mw, mh) = monitor_size.map(|s| (s.width, s.height)).unwrap_or((1920.0, 1080.0));

                // Calculate auto size: 30% width, 50% height, clamped
                let auto_w = (mw * 0.3_f64).clamp(360.0, 600.0);
                let auto_h = (mh * 0.5_f64).clamp(400.0, 700.0);

                let w = saved_cfg.window_width.unwrap_or(auto_w);
                let h = saved_cfg.window_height.unwrap_or(auto_h);
                let _ = window.set_size(Size::Logical(LogicalSize::new(w, h)));

                // Restore saved position or center
                if let (Some(x), Some(y)) = (saved_cfg.window_x, saved_cfg.window_y) {
                    let _ = window.set_position(LogicalPosition::new(x, y));
                } else {
                    let _ = window.center();
                }
            }

            // Hide from taskbar using Windows API
            #[cfg(target_os = "windows")]
            {
                use windows::Win32::UI::WindowsAndMessaging::*;
                use windows::Win32::Foundation::HWND;
                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(raw_hwnd) = window.hwnd() {
                        let hwnd = HWND(raw_hwnd.0 as _);
                        if !hwnd.0.is_null() {
                            unsafe {
                                // Hide window first
                                ShowWindow(hwnd, SW_HIDE);
                                // Set tool window style
                                let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
                                SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex_style | WS_EX_TOOLWINDOW.0 as isize);
                                // Force taskbar refresh
                                SetWindowPos(hwnd, None, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
                            }
                        }
                    }
                    let _ = window.hide();
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::process_memo,
            commands::list_memos,
            commands::list_todos,
            commands::toggle_todo,
            commands::search_memos,
            commands::delete_memo,
            commands::clear_all_memos,
            commands::get_settings,
            commands::save_settings,
            commands::check_api_key,
            commands::check_path_exists,
            commands::init_obsidian_dirs,
            commands::save_window_position,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
