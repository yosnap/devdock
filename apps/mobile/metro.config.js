// Metro bundler config for pnpm monorepo
// Resolves duplicate package issues by blocking resolution outside project root

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch entire monorepo so Metro sees changes in packages/*
config.watchFolders = [monorepoRoot];

// Resolve modules from both local and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Prevent duplicate packages: always resolve from mobile's node_modules first
// This avoids the "No QueryClient set" and "Invalid hook call" errors
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const SHARED_MODULES = ['react', 'react-native', '@tanstack/react-query'];

  if (SHARED_MODULES.some(m => moduleName === m || moduleName.startsWith(m + '/'))) {
    return context.resolveRequest(
      { ...context, nodeModulesPaths: [path.resolve(projectRoot, 'node_modules')] },
      moduleName,
      platform,
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
