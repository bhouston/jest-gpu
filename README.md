<p align="center">
  <a href="https://npmjs.com/package/jest-environment-webgpu-node"><img src="https://img.shields.io/npm/v/jest-environment-webgpu-node.svg" alt="npm package"></a>
  <a href="https://www.npmtrends.com/jest-environment-webgpu-node"><img src="https://img.shields.io/npm/dw/jest-environment-webgpu-node.svg" alt="npm downloads"></a>
  <a href="https://codecov.io/gh/bhouston/jest-gpu"><img src="https://codecov.io/gh/bhouston/jest-gpu/branch/main/graph/badge.svg" alt="coverage"></a>
  <a href="https://discord.gg/fwupDN493R"><img src="https://img.shields.io/badge/chat-discord-blue?style=flat&logo=discord" alt="discord chat"></a>
</p>
<br/>

# jest-gpu

> Real WebGL and WebGPU tests in plain Jest, with no browser.

- 🖥️ Real GPU in Node
- 🚫 No Browser or Mocks
- 🎨 WebGL 1, 2 and WebGPU
- 📦 Dual ESM and CommonJS
- ⚡ Up to 2.4x Faster Than Browsers

Two Jest environments put a GPU-backed context on the test's sandbox global, so three.js, Babylon.js and plain
WebGL/WebGPU code run unchanged. Native GPU testing runs up to 2.4x faster than the same tests in a browser, see
[the write-up](https://ben3d.ca/blog/native-gpu-testing-for-vitest-and-jest) for details.

## Packages

| Package                                                                 | Version (click for changelogs)                                                                                                                                    |
| ----------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`jest-environment-webgpu-node`](packages/jest-environment-webgpu-node) | [![jest-environment-webgpu-node version](https://img.shields.io/npm/v/jest-environment-webgpu-node.svg?label=%20)](https://github.com/bhouston/jest-gpu/releases) |
| [`jest-environment-webgl-node`](packages/jest-environment-webgl-node)   | [![jest-environment-webgl-node version](https://img.shields.io/npm/v/jest-environment-webgl-node.svg?label=%20)](https://github.com/bhouston/jest-gpu/releases)   |

Using Vitest? Equivalent packages for Vitest live in [vitest-gpu](https://github.com/bhouston/vitest-gpu):
[`vitest-environment-webgpu-node`](https://github.com/bhouston/vitest-gpu/tree/main/packages/vitest-environment-webgpu-node)
and [`vitest-environment-webgl-node`](https://github.com/bhouston/vitest-gpu/tree/main/packages/vitest-environment-webgl-node).

## Render with WebGPU

Use [`jest-environment-webgpu-node`](packages/jest-environment-webgpu-node/README.md) for headless
WebGPU rendering. This example renders a three.js cube and reads back the center pixel.

```sh
pnpm init
pnpm pkg set type=module
pnpm add -D jest jest-environment-node @jest/globals @swc/core @swc/jest typescript @types/node @types/three @webgpu/types jest-environment-webgpu-node three
```

Create `globals.d.ts` so TypeScript sees the environment globals:

```ts
import 'jest-environment-webgpu-node/globals';
```

```js
// jest.config.mjs
export default {
  testEnvironment: 'jest-environment-webgpu-node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: { '^.+\\.ts$': ['@swc/jest', { module: { type: 'es6' } }] },
};
```

Create `tsconfig.json`:

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

Run the TypeScript ESM test with:

```sh
NODE_OPTIONS=--experimental-vm-modules pnpm exec jest
```

`createCanvas` is installed as a global (CommonJS test files can use it without importing it) and
is also a named export for ESM test files. Add `import 'jest-environment-webgpu-node/globals';` to
a `.d.ts` file your tsconfig includes to type the global.

## Render with WebGL

Use [`jest-environment-webgl-node`](packages/jest-environment-webgl-node/README.md) for headless
WebGL 1/2 rendering. Same shape, using `document.createElement('canvas')` and `gl.readPixels`.

```sh
pnpm init
pnpm pkg set type=module
pnpm add -D jest jest-environment-node @jest/globals @swc/core @swc/jest typescript @types/node @types/three jest-environment-webgl-node three
```

Create `globals.d.ts` for the WebGL browser globals:

```ts
import 'jest-environment-webgl-node/globals';
```

```js
// jest.config.mjs
export default {
  testEnvironment: 'jest-environment-webgl-node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: { '^.+\\.ts$': ['@swc/jest', { module: { type: 'es6' } }] },
};
```

Use the same `tsconfig.json` shown above, removing `@webgpu/types` from `types`, then run:

```sh
NODE_OPTIONS=--experimental-vm-modules pnpm exec jest
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

## ESM note

Both packages ship as dual ESM/CommonJS builds, so `require('jest-environment-webgpu-node')` and
`require('jest-environment-webgl-node')` work from plain CommonJS test files, and `testEnvironment`
resolves either package by name either way. `NODE_OPTIONS=--experimental-vm-modules` is only needed
when a test file itself imports an ESM-only library, such as `three/webgpu` or `@babylonjs/lite`,
together with a TypeScript transform that emits ESM. This repo's own [`jest.config.mjs`](jest.config.mjs)
and [`jest.project.mjs`](jest.project.mjs) show a working setup with `@swc/jest`.

## Screenshots

This repo ships no screenshot matcher. Pair with [`jest-image-snapshot`](https://github.com/americanexpress/jest-image-snapshot)
by encoding the RGBA readback to PNG with [`sharp`](https://sharp.pixelplumbing.com/):

```ts
const png = await sharp(data, { raw: { width, height, channels: 4 } })
  .png()
  .toBuffer();
expect(png).toMatchImageSnapshot();
```

For a complete project you can copy, explore the [`demo/`](demo): its own package manifest, Jest
and TypeScript configuration, device checks, uploads, readbacks, triangles, and rendering with
three.js, Babylon.js, Babylon Lite and vgpu.

## Development

```sh
pnpm install
pnpm test
pnpm test:coverage
```

## Contribution

See [Contributing Guide](CONTRIBUTING.md).

## License

MIT

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
