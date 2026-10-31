import { createRequire } from 'node:module';
import { dirname, join, toNamespacedPath } from 'node:path';
import { defineConfig } from 'tsdown';

// rolldown-plugin-dts 0.28.6 only auto-detects TypeScript 7.0, so select
// the installed native compiler explicitly for TypeScript 7.1 beta.
const requireFromTypeScript = createRequire(import.meta.resolve('typescript/package.json'));
const nativePackage = `@typescript/typescript-${process.platform}-${process.arch}`;
const compilerPath = toNamespacedPath(
  join(
    dirname(requireFromTypeScript.resolve(`${nativePackage}/package.json`)),
    'lib',
    process.platform === 'win32' ? 'tsc.exe' : 'tsc',
  ),
);

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: { generator: 'tsgo', tsgo: { path: compilerPath } },
  platform: 'node',
  sourcemap: true,
  outDir: 'dist',
  // Keep the CJS output as `exports.default = ...` (not `module.exports = ...`): the emitted
  // .d.cts always uses `export default`, and disabling this default rewrite keeps the JS and its
  // types in agreement so attw doesn't flag a FalseExportDefault mismatch.
  cjsDefault: false,
});
