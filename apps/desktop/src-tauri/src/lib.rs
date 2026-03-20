mod commands;
mod models;
mod services;

use commands::*;
use services::{
    background_worker::start_background_worker,
    db_service::{init_db, DbState},
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let pool = init_db(&handle).await.expect("Failed to initialize database");
                // Start background worker for git + deps scanning
                let _worker = start_background_worker(pool.clone());
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
            analyze_project_tech,
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
            // Git commands
            get_git_status,
            get_cached_git_status,
            refresh_project_git,
            // Deps commands
            get_deps,
            scan_deps,
            check_outdated,
            // Notes + Links commands
            get_notes,
            save_notes,
            get_links,
            upsert_link,
            delete_link,
            // Structured note items
            list_note_items,
            create_note_item,
            update_note_item,
            toggle_note_resolved,
            delete_note_item,
            link_note_to_issue,
            // App preferences
            get_preference,
            set_preference,
            // GitHub commands
            save_github_token,
            get_github_token_status,
            delete_github_token,
            detect_github_repo,
            get_ci_status,
            get_issues,
            create_issue,
            // Health + Quick Launch commands
            get_health_config,
            save_health_config,
            calculate_project_health,
            get_projects_needing_attention,
            quick_search_projects,
            // Updater + Export/Import commands
            get_app_info,
            check_for_update,
            install_update,
            export_config,
            import_config,
            // Avatar commands
            upload_avatar,
            remove_avatar,
            get_avatar_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
