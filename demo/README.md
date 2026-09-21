# Standalone demo

This directory is a complete Jest project for real WebGL and WebGPU tests in Node. It includes
TypeScript and CommonJS examples for the two environments, plus examples using three.js,
Babylon.js, Babylon Lite, and vgpu.

In a clone of this repository, build the workspace packages before running the demo:

```sh
pnpm install
pnpm build
cd demo
pnpm test
```

Run the type check or the CommonJS examples separately with:

```sh
pnpm tsc
pnpm test:cjs
```

The TypeScript suites use ESM-only libraries, so the `test` script supplies
`NODE_OPTIONS=--experimental-vm-modules`. The CommonJS script intentionally omits that option.

To use this as a project outside this repository, export the tracked demo files (so local
`node_modules` links and build artifacts are not copied), then replace the two `workspace:*`
dependency versions in `package.json` with published versions:

```sh
mkdir ../my-gpu-tests
git archive HEAD:demo | tar -x -C ../my-gpu-tests
cd ../my-gpu-tests
pnpm pkg set devDependencies.jest-environment-webgl-node=latest
pnpm pkg set devDependencies.jest-environment-webgpu-node=latest
pnpm install
pnpm test
```

The local [`jest.config.mjs`](jest.config.mjs), [`tsconfig.json`](tsconfig.json), package scripts,
and dependencies are self-contained; the copied project does not need any configuration from the
repository root.
