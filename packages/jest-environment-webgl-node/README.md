# jest-environment-webgl-node

Real, headless WebGL 1 and WebGL 2 inside Jest, with no browser. Powered by
[`@onirenaud/node-webgl`](https://github.com/RenaudRohlinger/node-webgl) (Chrome's ANGLE, statically linked).

The environment installs `window`, `document`, `HTMLCanvasElement`, `Image`, `requestAnimationFrame`,
the `WebGL*` classes and a file-reading `fetch()` on the test's sandbox global, and removes them
after the test file finishes. `document.createElement('canvas').getContext('webgl2')` returns a
GPU-backed context, so three.js, regl, pixi and plain WebGL code run unchanged.

## Install

```sh
pnpm add -D jest jest-environment-webgl-node
```

## Usage

```js
// jest.config.mjs
export default {
  testEnvironment: 'jest-environment-webgl-node',
  testEnvironmentOptions: { backend: 'swiftshader', innerWidth: 800, innerHeight: 600 },
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

`testEnvironmentOptions` are those of node-webgl's `init()` (`backend`, `api`) and `installDOM()`
(`baseDir`, `fetch`, `devicePixelRatio`, `innerWidth`, `innerHeight`, `frameInterval`). Because
`installDOM()` writes to the host `globalThis` and is idempotent, only the **first** test file's
options take effect for the underlying host install; every test file's sandbox still gets the
same installed globals copied in.

Types for the installed globals: add `import 'jest-environment-webgl-node/globals';` to a `.d.ts`
file your tsconfig includes.

This package ships both an ESM and a CommonJS build, so `require('jest-environment-webgl-node')`
works from a plain CommonJS test file. `NODE_OPTIONS=--experimental-vm-modules` is only needed when
a test file itself imports an ESM-only library.

On Linux CI install Mesa (`apt-get install libegl1 libgles2 libgl1-mesa-dri`) and set
`LIBGL_ALWAYS_SOFTWARE=1`. macOS and Windows use prebuilt binaries.

## Author

Created by [Ben Houston](https://ben3d.ca) and sponsored by [Land of Assets](https://landofassets.com).

## License

MIT
