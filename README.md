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
pnpm add -D jest jest-environment-webgpu-node three
```

```js
// jest.config.mjs
export default {
  testEnvironment: 'jest-environment-webgpu-node',
};
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
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 3;
  const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshNormalMaterial());
  cube.rotation.set(0.4, 0.6, 0);
  scene.add(cube);

  await renderer.renderAsync(scene, camera);
  const { width, height, data } = await canvas.readPixels();
  const center = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
  expect(data[center + 3]).toBe(255); // the cube covers the center pixel
  renderer.dispose();
});
```

`createCanvas` is installed as a global (CommonJS test files can use it without importing it) and
is also a named export for ESM test files. Add `import 'jest-environment-webgpu-node/globals';` to
a `.d.ts` file your tsconfig includes to type the global.

## Render with WebGL

Use [`jest-environment-webgl-node`](packages/jest-environment-webgl-node/README.md) for headless
WebGL 1/2 rendering. Same shape, using `document.createElement('canvas')` and `gl.readPixels`.

```sh
pnpm add -D jest jest-environment-webgl-node three
```

```js
// jest.config.mjs
export default {
  testEnvironment: 'jest-environment-webgl-node',
};
```

```ts
// cube.test.ts
import * as THREE from 'three';
import { expect, it } from '@jest/globals';

it('renders a cube', () => {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(256, 256, false);
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
  expect(pixels[3]).toBe(255); // the cube covers the center pixel
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

For more examples, explore [`demo/`](demo): device checks, uploads, readbacks, triangles, and
rendering with three.js, Babylon.js, Babylon Lite and vgpu.

## Development

```sh
pnpm install
pnpm test
pnpm test:coverage
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, commit and release workflow.

## License

MIT

[tests-badge]: https://github.com/bhouston/jest-gpu/actions/workflows/ci.yml/badge.svg
[tests-url]: https://github.com/bhouston/jest-gpu/actions/workflows/ci.yml
[coverage-badge]: https://codecov.io/gh/bhouston/jest-gpu/graph/badge.svg
[coverage-url]: https://codecov.io/gh/bhouston/jest-gpu
