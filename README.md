<p align="center">
  <a href="https://npmjs.com/package/jest-environment-webgpu-node"><img src="https://img.shields.io/npm/v/jest-environment-webgpu-node.svg" alt="npm package"></a>
  <a href="https://www.npmtrends.com/jest-environment-webgpu-node"><img src="https://img.shields.io/npm/dw/jest-environment-webgpu-node.svg" alt="npm downloads"></a>
  <a href="https://codecov.io/gh/bhouston/jest-gpu"><img src="https://codecov.io/gh/bhouston/jest-gpu/branch/main/graph/badge.svg" alt="coverage"></a>
  <a href="https://discord.gg/fwupDN493R"><img src="https://img.shields.io/badge/chat-discord-blue?style=flat&logo=discord" alt="discord chat"></a>
  <a href="https://jest-gpu.ben3d.ca/"><img src="https://img.shields.io/badge/docs-read-blue?style=flat" alt="documentation"></a>
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

Using Vitest? Equivalent packages for Vitest live in [vitest-gpu](https://github.com/bhouston/vitest-gpu) ([docs](https://vitest-gpu.ben3d.ca/)):
[`vitest-environment-webgpu-node`](https://github.com/bhouston/vitest-gpu/tree/main/packages/vitest-environment-webgpu-node)
and [`vitest-environment-webgl-node`](https://github.com/bhouston/vitest-gpu/tree/main/packages/vitest-environment-webgl-node).

## Quick start

[Read the Docs to Learn More](https://jest-gpu.ben3d.ca/) for getting started in CommonJS or ESM, the WebGL and WebGPU environments, running on GPU-less CI, and an automatically generated API reference.

```sh
pnpm add -D jest jest-environment-webgl-node
```

```js
// jest.config.js
module.exports = { testEnvironment: 'jest-environment-webgl-node' };
```

```js
// clear.test.js
test('clears a WebGL2 canvas and reads it back', () => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  gl.clearColor(0, 1, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const pixels = new Uint8Array(4);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  expect(Array.from(pixels)).toEqual([0, 255, 0, 255]);
});
```

- [Getting started](https://jest-gpu.ben3d.ca/docs/getting-started/): install, config and a first passing test, with CommonJS and ESM/TypeScript setups.
- [WebGL](https://jest-gpu.ben3d.ca/docs/webgl/): options, a fresh DOM per test file, fake timers and canvas cleanup.
- [WebGPU](https://jest-gpu.ben3d.ca/docs/webgpu/): Dawn options, the headless canvas, `readPixels()` and image snapshots.
- [CI](https://jest-gpu.ben3d.ca/docs/ci/): Mesa llvmpipe and lavapipe on GPU-less runners.
- [API reference](https://jest-gpu.ben3d.ca/docs/api/): generated from the TSDoc comments.

The [package READMEs](packages) are also available offline. For a complete project you can copy, explore the [`demo/`](demo).

## Development

```sh
pnpm install
pnpm test
pnpm test:coverage
pnpm docs:dev # documentation site
```

## Releases

See [RELEASING.md](RELEASING.md) for how releases are published and [GitHub Releases](https://github.com/bhouston/jest-gpu/releases) for changes.

## Contribution

See [Contributing Guide](CONTRIBUTING.md).

## License

MIT

## Author

[Ben Houston](https://ben3d.ca), Sponsored by [Land of Assets](https://landofassets.com).
