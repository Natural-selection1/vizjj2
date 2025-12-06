// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod bindings;
mod ipc_commands;

use std::collections::HashMap;

#[allow(unused_imports)]
use log::{debug, info};
use serde_json::json;
use tauri::Manager as _;
use tauri_plugin_log::{Target, TargetKind, TimezoneStrategy};
use time::macros::format_description;
#[cfg(windows)]
use windows::Win32::System::Console::{ATTACH_PARENT_PROCESS, AttachConsole};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // safety: FFI
    // before parsing args, attach a console on windows
    // will fail if not started from a shell, but that's fine
    #[cfg(windows)]
    let _ = unsafe { AttachConsole(ATTACH_PARENT_PROCESS) };

    tauri::Builder::default()
        // * 加入插件时应该保证单例处理永远在第一个
        .plugin(tauri_plugin_single_instance::init(handle_single_instant))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(init_log_subscriber().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![ipc_commands::get_commits])
        .setup(|app| {
            tauri_plugin_store::StoreBuilder::new(app, "vizjj-settings.json")
                .defaults(HashMap::from_iter([
                    ("theme".into(), json!("system")),
                    ("font_size".into(), json!(18)),
                ]))
                .build()
                .expect("failed to build settings store")
                .save()
                .expect("failed to save settings");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn handle_single_instant(app: &tauri::AppHandle, _argv: Vec<String>, _cwd: String) {
    if let Some(window) = app.get_webview_window("main") {
        info!("vizjj为单例应用, 将恢复现有窗口");
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn init_log_subscriber() -> tauri_plugin_log::Builder {
    tauri_plugin_log::Builder::new()
        .max_file_size(50 * 1024)
        .level(
            #[cfg(debug_assertions)]
            tauri_plugin_log::log::LevelFilter::Debug,
            #[cfg(not(debug_assertions))]
            tauri_plugin_log::log::LevelFilter::Trace,
        )
        .format(|out, message, record| {
            let format = format_description!("[[[month]-[day]][[[hour]:[minute]:[second]]");
            out.finish(format_args!(
                "[{}]{}[{}]\n{}",
                record.level(),
                TimezoneStrategy::UseUtc.get_now().format(&format).unwrap(),
                record.target(),
                message,
            ))
        })
        .targets({
            #[cfg(debug_assertions)]
            let log_targets = [
                Target::new(TargetKind::Stdout),
                Target::new(TargetKind::Folder {
                    path: std::path::PathBuf::from("./"),
                    file_name: Some("vizjj".into()),
                }),
            ];
            #[cfg(not(debug_assertions))]
            let log_targets = [Target::new(TargetKind::LogDir {
                file_name: Some("vizjj".into()),
            })];

            log_targets
        })
}
