/// Auth module: Supabase email/password sign-in, sign-out, token refresh.
/// Commands are registered in lib.rs via tauri::generate_handler!.
pub mod auth_commands;
pub mod token_refresh;

pub use auth_commands::{get_current_user, sign_in_with_email, sign_out};
