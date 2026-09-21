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
(`baseDir`, `fetch`, `devicePixelRatio`, `innerWidth`, `innerHeight`, `frameInterval`). Each test
file receives a fresh document, DOM event state, viewport values, file-fetch base directory and
animation-frame queue. Animation frames use Jest's sandbox timers, so `jest.useFakeTimers()` and
`jest.advanceTimersByTime()` control them; pending frames are cancelled during environment
teardown.

File fetching is enabled by default. Relative paths resolve from that test file's `baseDir`
(default: `process.cwd()`), while HTTP, data and blob URLs use Node's native `fetch`. Set
`fetch: false` to use native fetch for every URL. The environment never replaces host globals.

The native WebGL display itself is process-wide. Set `backend` and `api` consistently across all
projects that can share a Jest worker; the environment reports a conflict if two explicit option
sets request different native initialization in one worker.

Types for the installed globals: add `import 'jest-environment-webgl-node/globals';` to a `.d.ts`
file your tsconfig includes.

This package ships both an ESM and a CommonJS build, so `require('jest-environment-webgl-node')`
works from a plain CommonJS test file. `NODE_OPTIONS=--experimental-vm-modules` is only needed when
a test file itself imports an ESM-only library.

On Linux CI install Mesa (`apt-get install libegl1 libgles2 libgl1-mesa-dri`) and set
`LIBGL_ALWAYS_SOFTWARE=1`. macOS and Windows use prebuilt binaries.

## Using Vitest?

The equivalent package for Vitest is
[`vitest-environment-webgl-node`](https://github.com/bhouston/vitest-gpu/tree/main/packages/vitest-environment-webgl-node)
from [vitest-gpu](https://github.com/bhouston/vitest-gpu).

## Author

Created by [Ben Houston](https://ben3d.ca) and sponsored by [Land of Assets](https://landofassets.com).

## License

MIT
