import { useState, useEffect } from 'react';
import { resolveAvatarUrl } from '../services/avatar-url-resolver';

/**
 * Resolves an avatar filename to a webview-safe URL.
 * Returns undefined while loading or if no filename provided.
 */
export function useAvatarUrl(filename: string | undefined | null): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!filename) {
      setUrl(undefined);
      return;
    }
    resolveAvatarUrl(filename).then(setUrl);
  }, [filename]);

  return url;
}
