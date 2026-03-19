mod commands;
mod models;
mod services;

use commands::*;
use services::db_service::{init_db, DbState};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let pool = init_db(&handle).await.expect("Failed to initialize database");
                handle.manage(DbState(pool));
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Project commands
            list_projects,
            add_project,
            update_project,
            delete_project,
            launch_project,
            detect_project_stack,
            // IDE commands
            list_ides,
            create_ide,
            update_ide,
            delete_ide,
            set_default_ide,
            // Workspace commands
            list_workspaces,
            create_workspace,
            update_workspace,
            delete_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
