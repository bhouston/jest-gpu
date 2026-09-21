# jest-environment-webgpu-node

Real, headless WebGPU inside Jest, with no browser. Powered by Google's Dawn through the
[`webgpu`](https://github.com/dawn-gpu/node-webgpu) npm package.

The environment puts `navigator.gpu` and every `GPU*` class and constant (`GPUBufferUsage`,
`GPUShaderStage`, ...) on the test's global object before each test file and removes them
afterwards.

## Install

```sh
pnpm add -D jest jest-environment-webgpu-node
```

## Usage

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

`dawnOptions` are passed straight to Dawn: `backend=<null|d3d11|d3d12|metal|vulkan|opengl|opengles>`,
`adapter=<name>`, `enable-dawn-features=...`, `disable-dawn-features=...`.

## Canvas

Dawn has no `<canvas>`, so the environment ships a headless one whose `getContext('webgpu')` returns a
`GPUCanvasContext` backed by a texture. `document.createElement('canvas')`, `HTMLCanvasElement`, `window`,
`self` and `requestAnimationFrame` are installed too (only when missing), which is enough for three.js
`WebGPURenderer`, Babylon Lite and vgpu to run unchanged.

`createCanvas` is installed as a global, so CommonJS test files can use it without an import. It is also
available as a named export for ESM test files:

```ts
import * as THREE from 'three/webgpu';
import { createCanvas } from 'jest-environment-webgpu-node';

const canvas = createCanvas(256, 256);
const renderer = new THREE.WebGPURenderer({ canvas: canvas.asElement() });
await renderer.init();
await renderer.renderAsync(scene, camera);
const { width, height, data } = await canvas.readPixels();
// data is RGBA8, top row first - feed it to a screenshot matcher such as jest-image-snapshot
```

`readPixels()` returns `{ width, height, data }` RGBA8 pixels. `asElement()` is the same object typed as an
`HTMLCanvasElement` for library signatures that demand one.

Import `jest-environment-webgpu-node/globals` in a `.d.ts` (or add it to `types` in `tsconfig.json`) to get
TypeScript types for the global `createCanvas`.

## ESM-only libraries

Node loads Jest test environment modules from the host realm, so this package needs no CJS build. Test files
themselves only need `NODE_OPTIONS=--experimental-vm-modules` when they import ESM-only libraries, such as
`three/webgpu`.
