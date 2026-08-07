const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '../..');
const sdkRoot = path.join(workspaceRoot, 'sdk');
const sdkSrc = path.join(sdkRoot, 'src');

/**
 * TypeScript ESM imports use `.js` extensions, but files are `.ts`/`.tsx`.
 * When bundling SDK from src, remap `./foo.js` → `./foo.tsx` | `./foo.ts`.
 */
function resolveSdkJsToTs(originModulePath, moduleName) {
  if (!originModulePath || !moduleName.startsWith('.') || !moduleName.endsWith('.js')) {
    return null;
  }
  const origin = path.resolve(originModulePath);
  if (!origin.startsWith(sdkSrc + path.sep) && origin !== path.join(sdkSrc, 'index.ts')) {
    // Also allow any file under sdk/src
    if (!origin.startsWith(sdkSrc)) return null;
  }

  const absBase = path.resolve(path.dirname(origin), moduleName.replace(/\.js$/, ''));
  for (const ext of ['.tsx', '.ts', '.jsx', '.js']) {
    const candidate = absBase + ext;
    if (fs.existsSync(candidate)) {
      return { filePath: candidate, type: 'sourceFile' };
    }
  }
  // directory index
  for (const ext of ['.tsx', '.ts', '.js']) {
    const candidate = path.join(absBase, 'index' + ext);
    if (fs.existsSync(candidate)) {
      return { filePath: candidate, type: 'sourceFile' };
    }
  }
  return null;
}

const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    unstable_enablePackageExports: true,
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    extraNodeModules: {
      '@alaznah/calling': sdkRoot,
    },
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === '@alaznah/calling') {
        return {
          filePath: path.join(sdkSrc, 'index.ts'),
          type: 'sourceFile',
        };
      }
      if (moduleName === '@alaznah/calling/ui') {
        return {
          filePath: path.join(sdkSrc, 'components/index.ts'),
          type: 'sourceFile',
        };
      }

      const sdkHit = resolveSdkJsToTs(context.originModulePath, moduleName);
      if (sdkHit) return sdkHit;

      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
