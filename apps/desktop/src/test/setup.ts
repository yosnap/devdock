/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';

// Mock Tauri API — not available in jsdom
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));
