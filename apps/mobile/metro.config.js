const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const monorepoRoot = path.resolve(__dirname, '../..');
const mobileNodeModules = path.resolve(__dirname, 'node_modules');

// These packages must ALWAYS resolve from the mobile app's node_modules,
// regardless of which package is importing them. This prevents duplicate
// instances (e.g. React 18 from root vs React 19 from mobile).
const FORCE_MOBILE_RESOLVE = new Set([
  'react',
  'react-native',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-native/Libraries/Utilities/Platform',
  'scheduler',
]);

const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      mobileNodeModules,
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    resolveRequest: (context, moduleName, platform) => {
      if (FORCE_MOBILE_RESOLVE.has(moduleName)) {
        return context.resolveRequest(
          { ...context, originModulePath: __filename },
          moduleName,
          platform,
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
