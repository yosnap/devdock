/// Auth types shared across the desktop app.
/// Mirrors the AuthUser struct in src/auth/auth_commands.rs.

export interface AuthUser {
  id: string;
  email: string;
  access_token: string;
  refresh_token: string;
}
