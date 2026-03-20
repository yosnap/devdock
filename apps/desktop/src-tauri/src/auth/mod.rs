/// Auth module: Supabase email/password sign-in, sign-out, token refresh.
/// Commands are registered in lib.rs via tauri::generate_handler!.
pub mod auth_commands;
pub mod token_refresh;
