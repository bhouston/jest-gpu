/** Settings every Jest project needs; projects do not inherit them from the root config. */
export default {
  extensionsToTreatAsEsm: ['.ts'],
  transform: { '^.+\\.ts$': ['@swc/jest', { module: { type: 'es6' } }] },
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  testTimeout: 60_000,
};
