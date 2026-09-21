// First GPU context init (Metal shader cache, Mesa llvmpipe) can take several seconds on a
// cold/loaded CI runner, hence the generous test timeout. Jest projects resolve independently
// and do NOT inherit this from the root config, so it must be repeated in every project (here
// and in each packages/*/jest.config.mjs, added alongside the packages).
const GPU_TEST_TIMEOUT = 60_000;

// `projects: ['<rootDir>/packages/*']` (and a `demo` project) belongs here once packages exist.
// Jest's config resolver throws ("Can't find a root directory while resolving a config file
// path") on a `projects` glob that matches zero directories, so it is omitted until the first
// package lands rather than left in as dead config that breaks `pnpm test`.

/** @type {import('jest').Config} */
export default {
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['@swc/jest', { module: { type: 'es6' } }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // scripts/workflow.test.mjs is a node:test suite (run via `pnpm test:workflow`), not a Jest
  // suite; Jest's default testMatch otherwise picks it up and fails with "must contain at least
  // one test" since it has no Jest `test()` calls.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/scripts/'],
  testTimeout: GPU_TEST_TIMEOUT,
  coverageProvider: 'v8',
  collectCoverageFrom: ['packages/*/src/**/*.ts', '!**/*.test.ts'],
  coverageThreshold: {
    global: { statements: 95, branches: 95, functions: 95, lines: 95 },
  },
  coverageReporters: ['text', 'lcov', 'json-summary'],
  passWithNoTests: true,
};
