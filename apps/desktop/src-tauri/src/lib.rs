#![allow(dead_code)]

mod auth;
mod commands;
mod models;
mod services;
mod sync;

use commands::*;
use services::{
    background_worker::start_background_worker,
    db_service::{init_db, DbState},
    keychain_service,
};
use sync::{
    startup_sync::pull_remote_changes,
    supabase_client::SupabaseClient,
    sync_commands::{clear_sync_queue, force_sync, get_sync_status, SupabaseState},
    sync_worker::start_sync_worker,
};
use std::sync::Arc;
use tauri::Manager;
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let pool = init_db(&handle).await.expect("Failed to initialize database");

                // Start background worker for git + deps scanning
                let _worker = start_background_worker(pool.clone());

                // Build Supabase client — baked in at compile time (same as auth_commands)
                let supabase_url = std::env::var("SUPABASE_URL")
                    .unwrap_or_else(|_| "https://wrlwhuxmtnmocfootpxh.supabase.co".to_string());
                let supabase_anon_key = std::env::var("SUPABASE_ANON_KEY")
                    .unwrap_or_else(|_| "sb_publishable_Yaw1VVE2hLvm4rJVsWV8ig_GBInoQ-9".to_string());

                // Load saved access token from keychain (empty string if not yet authed)
                let access_token = keychain_service::get_supabase_token()
                    .unwrap_or_default()
                    .unwrap_or_default();

                let supabase = Arc::new(SupabaseClient::new(
                    supabase_url,
                    supabase_anon_key,
                    access_token.clone(),
                ));

                // Start outbound sync worker
                let app_data = handle.path().app_data_dir().expect("app_data_dir");
                let avatars_dir = app_data.join("avatars");
                start_sync_worker(pool.clone(), supabase.clone(), handle.clone(), avatars_dir);

                // Pull remote changes if user is authenticated
                if !access_token.is_empty() {
                    let user_id: Option<String> = sqlx::query_scalar(
                        "SELECT value FROM app_preferences WHERE key = 'user_id'",
                    )
                    .fetch_optional(&pool)
                    .await
                    .unwrap_or(None)
                    .flatten();

                    if let Some(uid) = user_id {
                        let pool_clone = pool.clone();
                        let supa_clone = supabase.clone();
                        tokio::spawn(async move {
                            if let Err(e) = pull_remote_changes(&pool_clone, &supa_clone, &uid).await {
                                eprintln!("[startup] pull_remote_changes failed: {e}");
                            }
                        });
                    }
                }

                handle.manage(DbState(pool));
                handle.manage(SupabaseState(supabase));
            });

            // Handle OAuth deep-link callbacks: devdock://auth/callback#access_token=...
            let handle_dl = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    let url_str = url.to_string();
                    if url_str.starts_with("devdock://auth/callback") {
                        let app_clone = handle_dl.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Err(e) = auth::auth_commands::handle_oauth_callback(&app_clone, &url_str).await {
                                eprintln!("[deep-link] OAuth callback error: {e}");
                            }
                        });
                    }
                }
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
            // Sync commands
            get_sync_status,
            force_sync,
            clear_sync_queue,
            // Auth commands
            auth::auth_commands::sign_in_with_email,
            auth::auth_commands::sign_in_with_github,
            auth::auth_commands::sign_out,
            auth::auth_commands::get_current_user,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
