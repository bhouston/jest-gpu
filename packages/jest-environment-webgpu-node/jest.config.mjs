import project from '../../jest.project.mjs';

export default {
  ...project,
  displayName: 'jest-environment-webgpu-node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
};
