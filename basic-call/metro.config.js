const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const repoRoot = path.resolve(__dirname, '../..');
const sdkRoot = path.join(repoRoot, 'alaznah-sdk');
const sdkSrc = path.join(sdkRoot, 'src');

const appReact = path.resolve(projectRoot, 'node_modules/react');
const appReactNative = path.resolve(projectRoot, 'node_modules/react-native');
const appBabelRuntime = path.resolve(projectRoot, 'node_modules/@babel/runtime');
const protocolRoot = path.join(sdkRoot, 'node_modules/@alaznah/protocol');

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
    if (!origin.startsWith(sdkSrc)) return null;
  }

  const absBase = path.resolve(path.dirname(origin), moduleName.replace(/\.js$/, ''));
  for (const ext of ['.tsx', '.ts', '.jsx', '.js']) {
    const candidate = absBase + ext;
    if (fs.existsSync(candidate)) {
      return { filePath: candidate, type: 'sourceFile' };
    }
  }
  for (const ext of ['.tsx', '.ts', '.js']) {
    const candidate = path.join(absBase, 'index' + ext);
    if (fs.existsSync(candidate)) {
      return { filePath: candidate, type: 'sourceFile' };
    }
  }
  return null;
}

function resolveFromApp(context, moduleName, platform) {
  // Force resolution as if the importer lived in the app — avoids SDK's
  // nested react@18 / react-native@0.76 copies (causes CallingProvider undefined).
  return context.resolveRequest(
    {
      ...context,
      originModulePath: path.join(projectRoot, 'package.json'),
      nodeModulesPaths: [path.resolve(projectRoot, 'node_modules')],
    },
    moduleName,
    platform,
  );
}

const config = {
  projectRoot,
  watchFolders: [sdkRoot],
  resolver: {
    unstable_enablePackageExports: true,
    // Prefer app node_modules; still allow SDK deps (protocol, etc.).
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(sdkRoot, 'node_modules'),
    ],
    extraNodeModules: {
      '@alaznah/calling': sdkRoot,
      '@alaznah/protocol': protocolRoot,
      react: appReact,
      'react-native': appReactNative,
      '@babel/runtime': appBabelRuntime,
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

      if (
        moduleName === 'react' ||
        moduleName === 'react/jsx-runtime' ||
        moduleName === 'react/jsx-dev-runtime' ||
        moduleName === 'react-native' ||
        moduleName.startsWith('react-native/') ||
        moduleName === '@babel/runtime' ||
        moduleName.startsWith('@babel/runtime/')
      ) {
        return resolveFromApp(context, moduleName, platform);
      }

      const sdkHit = resolveSdkJsToTs(context.originModulePath, moduleName);
      if (sdkHit) return sdkHit;

      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
