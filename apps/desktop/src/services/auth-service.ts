/// Thin wrapper around Tauri invoke calls for Supabase auth.
/// All auth state lives in useDesktopAuth hook — this module is stateless.
import { invoke } from '@tauri-apps/api/core';
import type { AuthUser } from '../types/auth-types';

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  return invoke<AuthUser>('sign_in_with_email', { email, password });
}

export async function signInWithGithub(): Promise<void> {
  return invoke<void>('sign_in_with_github');
}

export async function signOut(): Promise<void> {
  return invoke<void>('sign_out');
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return invoke<AuthUser | null>('get_current_user');
}
