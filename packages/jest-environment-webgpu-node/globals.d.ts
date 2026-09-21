// Ambient typing for the `createCanvas` global this environment installs on `globalThis`, for
// CommonJS test files that use the global instead of importing this ESM package.
declare const createCanvas: typeof import('jest-environment-webgpu-node').createCanvas;
