import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  platform: 'node',
  sourcemap: true,
  outDir: 'dist',
  // Keep the CJS output as `exports.default = ...` (not `module.exports = ...`): the emitted
  // .d.cts always uses `export default`, and disabling this default rewrite keeps the JS and its
  // types in agreement so attw doesn't flag a FalseExportDefault mismatch.
  cjsDefault: false,
});
