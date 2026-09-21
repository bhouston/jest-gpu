import project from './jest.project.mjs';

/** @type {import('jest').Config} */
export default {
  ...project,
  projects: ['<rootDir>/packages/*'],
  // scripts/workflow.test.mjs is a node:test suite (run via `pnpm test:workflow`), not a Jest
  // suite; Jest's default testMatch otherwise picks it up and fails with "must contain at least
  // one test" since it has no Jest `test()` calls.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/scripts/'],
  coverageProvider: 'v8',
  collectCoverageFrom: ['packages/*/src/**/*.ts', '!**/*.test.ts'],
  coverageThreshold: {
    global: { statements: 95, branches: 95, functions: 95, lines: 95 },
  },
  coverageReporters: ['text', 'lcov', 'json-summary'],
  passWithNoTests: true,
};
