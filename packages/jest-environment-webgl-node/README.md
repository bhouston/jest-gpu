<p align="center">
  <a href="https://npmjs.com/package/jest-environment-webgl-node"><img src="https://img.shields.io/npm/v/jest-environment-webgl-node.svg" alt="npm package"></a>
  <a href="https://www.npmtrends.com/jest-environment-webgl-node"><img src="https://img.shields.io/npm/dw/jest-environment-webgl-node.svg" alt="npm downloads"></a>
  <a href="https://codecov.io/gh/bhouston/jest-gpu"><img src="https://codecov.io/gh/bhouston/jest-gpu/branch/main/graph/badge.svg" alt="coverage"></a>
  <a href="https://discord.gg/fwupDN493R"><img src="https://img.shields.io/badge/chat-discord-blue?style=flat&logo=discord" alt="discord chat"></a>
</p>
<br/>

# jest-environment-webgl-node

> Real WebGL 1 and 2 tests in plain Jest, with no browser.

- 🖥️ Real WebGL 1 and 2
- 🚫 No Browser or Mocks
- 🧩 Fresh DOM Per Test File
- ⏱️ Works With Jest Fake Timers
- 📦 Dual ESM and CommonJS
- ⚡ Up to 2.4x Faster Than Browsers

Real, headless WebGL 1 and WebGL 2 inside Jest. `document.createElement('canvas').getContext('webgl2')` returns a
GPU-backed context, so three.js, regl, pixi and plain WebGL code run unchanged. Native GPU testing runs up to 2.4x
faster than the same tests in a browser, see [the write-up](https://ben3d.ca/blog/native-gpu-testing-for-vitest-and-jest).
Powered by [`@onirenaud/node-webgl`](https://github.com/RenaudRohlinger/node-webgl) (Chrome's ANGLE, statically linked).

Part of [jest-gpu](https://github.com/bhouston/jest-gpu), which also provides the WebGPU environment.

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

Teardown also disposes canvases created by `document.createElement`, `document.createElementNS`,
`new HTMLCanvasElement` and `new OffscreenCanvas`, releasing their native contexts and GPU resources.
Canvases are retained until teardown; call `canvas.dispose()` when finished using one. Canvases or
contexts created directly through imports from `@onirenaud/node-webgl` remain the caller's responsibility.

File fetching is enabled by default. Relative paths resolve from that test file's `baseDir`
(default: `process.cwd()`), while HTTP, data and blob URLs use Node's native `fetch`. Set
`fetch: false` to use native fetch for every URL. The environment never replaces host globals.

The native WebGL display itself is process-wide and is created by the first context in a worker, so
set `backend` and `api` consistently across all projects that can share a Jest worker. The
environment throws if an explicit `backend` or `api` disagrees with the display already initialized
in that worker, including one initialized with platform defaults by a project that set no options.

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

## Contribution

See [Contributing Guide](https://github.com/bhouston/jest-gpu/blob/main/CONTRIBUTING.md).

## License

MIT

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
