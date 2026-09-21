import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

const typescriptProject = {
  rootDir,
  extensionsToTreatAsEsm: ['.ts'],
  transform: { '^.+\\.ts$': ['@swc/jest', { module: { type: 'es6' } }] },
  testTimeout: 60_000,
};

/** @type {import('jest').Config['projects']} */
export const projects = [
  {
    ...typescriptProject,
    displayName: 'demo-webgl',
    testEnvironment: 'jest-environment-webgl-node',
    testMatch: ['<rootDir>/test/webgl/**/*.test.ts'],
  },
  {
    ...typescriptProject,
    displayName: 'demo-webgpu',
    testEnvironment: 'jest-environment-webgpu-node',
    testMatch: ['<rootDir>/test/webgpu/**/*.test.ts'],
  },
  {
    displayName: 'demo-cjs-webgl',
    rootDir,
    testEnvironment: 'jest-environment-webgl-node',
    testMatch: ['<rootDir>/test/cjs/webgl.test.cjs'],
    transform: {},
    testTimeout: 60_000,
  },
  {
    displayName: 'demo-cjs-webgpu',
    rootDir,
    testEnvironment: 'jest-environment-webgpu-node',
    testMatch: ['<rootDir>/test/cjs/webgpu.test.cjs'],
    transform: {},
    testTimeout: 60_000,
  },
];

/** @type {import('jest').Config} */
export default { projects };
