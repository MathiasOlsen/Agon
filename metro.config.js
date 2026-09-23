// Metro configuration.
//
// Agon's local database is a native module on iOS and Android. When the app is
// bundled for a browser it falls back to expo-sqlite's WebAssembly build, which
// needs two things Metro does not do by default:
//
//   1. `.wasm` has to be treated as an asset, or the import cannot be resolved.
//   2. The page has to be cross-origin isolated, because the SQLite worker uses
//      shared memory.
//
// Neither affects the iOS or Android builds. The handoff defers a browser
// release, so this exists to make a desktop preview possible, not to ship one.

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

config.server.enhanceMiddleware = (middleware) => (request, response, next) => {
  response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(request, response, next);
};

module.exports = config;
