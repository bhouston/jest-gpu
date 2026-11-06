---
sidebar_position: 1
description: Install a jest-gpu environment, point Jest at it and run your first real WebGL or WebGPU test in Node, in CommonJS or ESM.
---

# Getting started

jest-gpu is two Jest environments, one for WebGL and one for WebGPU. Each puts a GPU-backed context on the test's global, so three.js, Babylon.js and plain WebGL or WebGPU code run unchanged in Node, with no browser and no mocks. Native GPU testing runs up to 2.4x faster than the same tests in a browser; see [the write-up](https://ben3d.ca/blog/native-gpu-testing-for-vitest-and-jest).

| Package                                                                                      | Use it for                              |
| -------------------------------------------------------------------------------------------- | --------------------------------------- |
| [`jest-environment-webgl-node`](https://www.npmjs.com/package/jest-environment-webgl-node)   | WebGL 1 and 2 (see [WebGL](./webgl.md)) |
| [`jest-environment-webgpu-node`](https://www.npmjs.com/package/jest-environment-webgpu-node) | WebGPU (see [WebGPU](./webgpu.md))      |

Using Vitest instead? See [vitest-gpu](https://vitest-gpu.ben3d.ca/).

## Install

Both packages support Node.js 22 or later and Jest 29 or 30, and ship as dual ESM and CommonJS builds. Install Jest and the environment you need:

```sh
pnpm add -D jest jest-environment-webgl-node
```

For WebGPU, install `jest-environment-webgpu-node` instead. Install both if you test both APIs.

pnpm 12 lists `@onirenaud/node-webgl` and `webgpu` under "Ignored build scripts" when you install them. In a fresh project the tests below passed without approving those scripts. If a context fails to create, approve them with `pnpm approve-builds`.

## Simplest setup: CommonJS

Set the environment in your Jest config. No transform and no extra flags are needed.

```js
// jest.config.js
module.exports = { testEnvironment: 'jest-environment-webgl-node' };
```

```js
// clear.test.js
test('clears a WebGL2 canvas and reads it back', () => {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const gl = canvas.getContext('webgl2');
  gl.clearColor(0, 1, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const pixels = new Uint8Array(4);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  expect(Array.from(pixels)).toEqual([0, 255, 0, 255]);
});
```

```sh
pnpm exec jest
```

The test runs on your real GPU, for example through Metal on macOS. On a Linux machine without a GPU, see [CI](./ci.md).

With WebGPU, `require('jest-environment-webgpu-node')` also works from a CommonJS test file, and `createCanvas` is installed as a global:

```js
// jest.config.js
module.exports = { testEnvironment: 'jest-environment-webgpu-node' };
```

```js
// webgpu.test.js
const { createCanvas } = require('jest-environment-webgpu-node');

test('clears a headless canvas and reads it back', async () => {
  const canvas = createCanvas(8, 8);
  const context = canvas.getContext('webgpu');
  const device = await (await navigator.gpu.requestAdapter()).requestDevice();
  context.configure({ device, format: navigator.gpu.getPreferredCanvasFormat() });

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      { view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: [1, 0, 0, 1] },
    ],
  });
  pass.end();
  device.queue.submit([encoder.finish()]);

  const { data } = await canvas.readPixels();
  expect(Array.from(data.subarray(0, 4))).toEqual([255, 0, 0, 255]);
  device.destroy();
});
```

## ESM and TypeScript

For TypeScript tests, or JavaScript tests that import ESM-only libraries such as `three/webgpu`, run Jest with an ESM transform. This example uses `@swc/jest` and three.js:

```sh
pnpm init
pnpm pkg set type=module
pnpm add -D jest jest-environment-node @jest/globals @swc/core @swc/jest typescript @types/node @types/three jest-environment-webgl-node three
```

```js
// jest.config.mjs
export default {
  testEnvironment: 'jest-environment-webgl-node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: { '^.+\\.ts$': ['@swc/jest', { module: { type: 'es6' } }] },
};
```

Create `globals.d.ts` so TypeScript sees the browser globals the environment installs:

```ts
import 'jest-environment-webgl-node/globals';
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
    "types": ["node"]
  },
  "include": ["**/*.ts"]
}
```

```ts
// cube.test.ts
import * as THREE from 'three';
import { expect, it } from '@jest/globals';

it('renders a cube', () => {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(256, 256, false);
  renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 3;
  const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshNormalMaterial());
  cube.rotation.set(0.4, 0.6, 0);
  scene.add(cube);

  renderer.render(scene, camera);
  const gl = renderer.getContext();
  const pixels = new Uint8Array(4);
  gl.readPixels(128, 128, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  expect(Array.from(pixels.subarray(0, 3))).not.toEqual([0, 0, 0]);
  expect(pixels[3]).toBe(255);
  renderer.dispose();
});
```

```sh
NODE_OPTIONS=--experimental-vm-modules pnpm exec jest
```

`NODE_OPTIONS=--experimental-vm-modules` is only needed when a test file itself imports an ESM-only library, together with a TypeScript transform that emits ESM. Plain CommonJS test files do not need it, and `testEnvironment` resolves either package by name in both setups. The WebGPU version of this example is on the [WebGPU](./webgpu.md) page.

## Next steps

- [WebGL](./webgl.md): options, fresh DOM per test file, fake timers, canvas disposal.
- [WebGPU](./webgpu.md): Dawn options, the headless canvas, `readPixels()` and image snapshots.
- [CI](./ci.md): Mesa packages and environment for runners without a GPU.
- [API reference](./api/index.md): every exported class, function and type.
- The repository's [`demo/`](https://github.com/bhouston/jest-gpu/tree/main/demo) is a complete project you can copy, with device checks, uploads, readbacks, triangles and rendering with three.js, Babylon.js, Babylon Lite and vgpu. Its `jest.config.mjs` and `jest.project.mjs` files show a working `@swc/jest` setup.
