/// React hook managing Supabase auth state for the desktop app.
/// Listens for auth:signed-in / auth:signed-out Tauri events so any
/// component tree that uses this hook stays in sync automatically.
import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { AuthUser } from '../types/auth-types';
import {
  getCurrentUser,
  signInWithEmail,
  signOut as authSignOut,
} from '../services/auth-service';

export interface DesktopAuthState {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useDesktopAuth(): DesktopAuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check persisted session on mount
  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Listen for auth events emitted by Rust commands
  useEffect(() => {
    const unlistenSignedIn = listen<AuthUser>('auth:signed-in', (event) => {
      setUser(event.payload);
    });

    const unlistenSignedOut = listen<void>('auth:signed-out', () => {
      setUser(null);
    });

    return () => {
      unlistenSignedIn.then((fn) => fn());
      unlistenSignedOut.then((fn) => fn());
    };
  }, []);

  async function signIn(email: string, password: string): Promise<void> {
    const authUser = await signInWithEmail(email, password);
    setUser(authUser);
  }

  async function signOut(): Promise<void> {
    await authSignOut();
    setUser(null);
  }

  return {
    user,
    loading,
    isAuthenticated: user !== null,
    signIn,
    signOut,
  };
}
