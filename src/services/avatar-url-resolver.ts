/**
 * Resolves avatar filenames to webview-safe URLs using Tauri's convertFileSrc.
 * Caches the app data directory path to avoid redundant IPC calls.
 */
import { appDataDir } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/core';

let cachedAppDataDir: string | null = null;

async function getAppDataDir(): Promise<string> {
  if (!cachedAppDataDir) {
    cachedAppDataDir = await appDataDir();
  }
  return cachedAppDataDir;
}

/**
 * Returns a webview-safe URL for an avatar filename, or undefined if no filename.
 * On macOS/Linux the path is `{appDataDir}/avatars/{filename}`.
 */
export async function resolveAvatarUrl(filename: string | undefined | null): Promise<string | undefined> {
  if (!filename) return undefined;
  const dir = await getAppDataDir();
  const fullPath = `${dir}/avatars/${filename}`;
  return convertFileSrc(fullPath);
}
