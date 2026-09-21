# jest-gpu

[![Tests][tests-badge]][tests-url]
[![Coverage][coverage-badge]][coverage-url]

Run real WebGL and WebGPU code inside plain Jest, with no browser, no Playwright and no mocks.
Two Jest environments put a GPU-backed context on the test's sandbox global, so three.js,
Babylon.js and plain WebGL/WebGPU code run unchanged.

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
    "lib": ["ES2024", "DOM"],
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

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, commit and release workflow.

## Using Vitest?

Equivalent packages for Vitest live in [vitest-gpu](https://github.com/bhouston/vitest-gpu):
[`vitest-environment-webgpu-node`](https://github.com/bhouston/vitest-gpu/tree/main/packages/vitest-environment-webgpu-node)
and [`vitest-environment-webgl-node`](https://github.com/bhouston/vitest-gpu/tree/main/packages/vitest-environment-webgl-node).

## Author

Created by [Ben Houston](https://ben3d.ca) and sponsored by [Land of Assets](https://landofassets.com).

## License

MIT

[tests-badge]: https://github.com/bhouston/jest-gpu/actions/workflows/ci.yml/badge.svg
[tests-url]: https://github.com/bhouston/jest-gpu/actions/workflows/ci.yml
[coverage-badge]: https://codecov.io/gh/bhouston/jest-gpu/graph/badge.svg
[coverage-url]: https://codecov.io/gh/bhouston/jest-gpu
