---
sidebar_position: 2
description: The jest-environment-webgl-node environment for Jest, with real headless WebGL 1 and 2, its options, per-file DOM and canvas cleanup.
---

# WebGL

`jest-environment-webgl-node` gives Jest real, headless WebGL 1 and WebGL 2. `document.createElement('canvas').getContext('webgl2')` returns a GPU-backed context, so three.js, Babylon.js, regl, pixi and plain WebGL code run unchanged. It is powered by [`@onirenaud/node-webgl`](https://github.com/RenaudRohlinger/node-webgl), which statically links Chrome's ANGLE.

## Install and configure

```sh
pnpm add -D jest jest-environment-webgl-node
```

```js
// jest.config.mjs
export default {
  testEnvironment: 'jest-environment-webgl-node',
  testEnvironmentOptions: { innerWidth: 800, innerHeight: 600 },
};
```

```ts
import * as THREE from 'three';
import { expect, it } from '@jest/globals';

it('renders', () => {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(64, 64, false);
  renderer.render(new THREE.Scene(), new THREE.PerspectiveCamera());

  const gl = renderer.getContext();
  const pixels = new Uint8Array(4);
  gl.readPixels(32, 32, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  expect(pixels[3]).toBe(255);
});
```

See [Getting started](./getting-started.md) for the complete ESM and CommonJS setups.

## Options

`testEnvironmentOptions` are those of node-webgl's `init()` and `installDOM()`:

- From `init()`: `backend`, `api`.
- From `installDOM()`: `baseDir`, `fetch`, `devicePixelRatio`, `innerWidth`, `innerHeight`, `frameInterval`.

The type is exported as `WebglNodeOptions`; see the [API reference](./api/index.md).

The native WebGL display is process-wide and is created by the first context in a worker, so set `backend` and `api` consistently across all projects that can share a Jest worker. The environment throws if an explicit `backend` or `api` disagrees with the display already initialized in that worker, including one initialized with platform defaults by a project that set no options.

## What each test file gets

Each test file receives a fresh document, DOM event state, viewport values, file-fetch base directory and animation-frame queue. The environment never replaces host globals.

Animation frames use Jest's sandbox timers, so `jest.useFakeTimers()` and `jest.advanceTimersByTime()` control them. Pending frames are cancelled during environment teardown.

## Canvases

Teardown disposes canvases created by `document.createElement`, `document.createElementNS`, `new HTMLCanvasElement` and `new OffscreenCanvas`, releasing their native contexts and GPU resources. Canvases are retained until teardown, so call `canvas.dispose()` when you finish with one. Canvases or contexts created directly through imports from `@onirenaud/node-webgl` remain your responsibility.

## Fetching files

File fetching is enabled by default. Relative paths resolve from the test file's `baseDir` (default: `process.cwd()`), while HTTP, data and blob URLs use Node's native `fetch`. Set `fetch: false` to use native fetch for every URL.

## TypeScript

Add `import 'jest-environment-webgl-node/globals';` to a `.d.ts` file your tsconfig includes to type the installed globals.

## ESM and CommonJS

The package ships both builds, so `require('jest-environment-webgl-node')` works from a plain CommonJS test file. `NODE_OPTIONS=--experimental-vm-modules` is only needed when a test file itself imports an ESM-only library.

## Image snapshots

jest-gpu ships no screenshot matcher. Pair it with [`jest-image-snapshot`](https://github.com/americanexpress/jest-image-snapshot) by reading pixels with `gl.readPixels` and encoding the RGBA data to PNG with [`sharp`](https://sharp.pixelplumbing.com/). The [WebGPU page](./webgpu.md#image-snapshots) shows the snippet.

## Linux CI

Install Mesa and force software rendering where there is no GPU; see [CI](./ci.md).

## Using Vitest?

The equivalent package for Vitest is `vitest-environment-webgl-node`, from [vitest-gpu](https://vitest-gpu.ben3d.ca/).
