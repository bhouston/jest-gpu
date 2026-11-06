---
sidebar_position: 3
description: The jest-environment-webgpu-node environment for Jest, with real headless WebGPU through Dawn, a headless canvas, pixel readback and image snapshots.
---

# WebGPU

`jest-environment-webgpu-node` gives Jest real, headless WebGPU, powered by Google's Dawn through the [`webgpu`](https://github.com/dawn-gpu/node-webgpu) npm package. It puts `navigator.gpu` and every `GPU*` class and constant on the test's global.

## Install and configure

```sh
pnpm add -D jest jest-environment-webgpu-node
```

```js
// jest.config.mjs
export default {
  testEnvironment: 'jest-environment-webgpu-node',
  testEnvironmentOptions: { dawnOptions: ['backend=vulkan'] },
};
```

```ts
import { expect, it } from '@jest/globals';

it('runs a compute shader', async () => {
  const device = await (await navigator.gpu.requestAdapter())!.requestDevice();
  // ...createShaderModule, dispatch, copy to a MAP_READ buffer, mapAsync, assert
});
```

`dawnOptions` are passed straight to Dawn: `backend=<null|d3d11|d3d12|metal|vulkan|opengl|opengles>`, `adapter=<name>`, `enable-dawn-features=...` and `disable-dawn-features=...`. The type is exported as `WebgpuNodeOptions`; see the [API reference](./api/index.md).

## Headless canvas

Dawn has no `<canvas>`, so the environment ships a headless one whose `getContext('webgpu')` returns a `GPUCanvasContext` backed by a texture. `document.createElement('canvas')`, `HTMLCanvasElement`, `window`, `self` and `requestAnimationFrame` are installed too, only when missing. That is enough for three.js `WebGPURenderer`, Babylon Lite and vgpu to run unchanged.

`createCanvas` is installed as a global, so CommonJS test files can use it without an import. It is also a named export for ESM test files:

```ts
import * as THREE from 'three/webgpu';
import { createCanvas } from 'jest-environment-webgpu-node';

const canvas = createCanvas(256, 256);
const renderer = new THREE.WebGPURenderer({ canvas: canvas.asElement() });
await renderer.init();
await renderer.renderAsync(scene, camera);
const { width, height, data } = await canvas.readPixels();
// data is RGBA8, top row first
```

`readPixels()` returns `{ width, height, data }` RGBA8 pixels for `rgba8unorm`, `rgba8unorm-srgb`, `bgra8unorm` and `bgra8unorm-srgb` canvas formats. Other formats are rejected explicitly. `asElement()` is the same object typed as an `HTMLCanvasElement`, for library signatures that demand one.

Import `jest-environment-webgpu-node/globals` in a `.d.ts` file, or add it to `types` in `tsconfig.json`, to type the global `createCanvas`.

## A complete three.js test

This is the ESM TypeScript setup from [Getting started](./getting-started.md), using the WebGPU environment.

```sh
pnpm init
pnpm pkg set type=module
pnpm add -D jest jest-environment-node @jest/globals @swc/core @swc/jest typescript @types/node @types/three @webgpu/types jest-environment-webgpu-node three
```

```js
// jest.config.mjs
export default {
  testEnvironment: 'jest-environment-webgpu-node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: { '^.+\\.ts$': ['@swc/jest', { module: { type: 'es6' } }] },
};
```

Create `globals.d.ts` so TypeScript sees the environment globals:

```ts
import 'jest-environment-webgpu-node/globals';
```

and a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "lib": ["ES2024"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node", "@webgpu/types"]
  },
  "include": ["**/*.ts"]
}
```

```ts
// cube.test.ts
import * as THREE from 'three/webgpu';
import { expect, it } from '@jest/globals';
import { createCanvas } from 'jest-environment-webgpu-node';

it('renders a cube', async () => {
  const canvas = createCanvas(256, 256);
  const renderer = new THREE.WebGPURenderer({ canvas: canvas.asElement() });
  await renderer.init();
  renderer.setSize(256, 256, false);
  renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 3;
  const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshNormalMaterial());
  cube.rotation.set(0.4, 0.6, 0);
  scene.add(cube);

  await renderer.renderAsync(scene, camera);
  const { width, height, data } = await canvas.readPixels();
  const center = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
  expect(Array.from(data.subarray(center, center + 3))).not.toEqual([0, 0, 0]);
  expect(data[center + 3]).toBe(255);
  renderer.dispose();
});
```

Run it with `NODE_OPTIONS=--experimental-vm-modules pnpm exec jest`.

## ESM and CommonJS

The package ships both builds, so `require('jest-environment-webgpu-node')` works from a plain CommonJS test file, and `testEnvironment: 'jest-environment-webgpu-node'` resolves the same way either way. `NODE_OPTIONS=--experimental-vm-modules` is only needed when a test file itself imports an ESM-only library, such as `three/webgpu`.

## Image snapshots

jest-gpu ships no screenshot matcher. `readPixels()` returns RGBA8 data with the top row first, so you can encode it to PNG with [`sharp`](https://sharp.pixelplumbing.com/) and compare it with [`jest-image-snapshot`](https://github.com/americanexpress/jest-image-snapshot):

```ts
const png = await sharp(data, { raw: { width, height, channels: 4 } })
  .png()
  .toBuffer();
expect(png).toMatchImageSnapshot();
```

For WebGL, use the same approach with the pixels from `gl.readPixels`.

## Linux and CI

Dawn needs Vulkan. On a machine without a GPU, install Mesa's software Vulkan driver (lavapipe); see [CI](./ci.md).

## Using Vitest?

The equivalent package for Vitest is `vitest-environment-webgpu-node`, from [vitest-gpu](https://vitest-gpu.ben3d.ca/).
