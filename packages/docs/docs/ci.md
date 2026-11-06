---
sidebar_position: 4
description: Run jest-gpu WebGL and WebGPU tests on CI runners without a GPU, using Mesa llvmpipe for WebGL and lavapipe for WebGPU.
---

# CI

GPU-less Linux runners can still run real WebGL and WebGPU tests. Install Mesa's software drivers: llvmpipe provides WebGL through EGL and OpenGL ES, and lavapipe provides the Vulkan device that Dawn uses for WebGPU.

```sh
sudo apt-get update && sudo apt-get install -y libegl1 libgles2 libgl1-mesa-dri mesa-vulkan-drivers
export LIBGL_ALWAYS_SOFTWARE=1
```

- WebGL (`jest-environment-webgl-node`) needs `libegl1`, `libgles2` and `libgl1-mesa-dri`, and `LIBGL_ALWAYS_SOFTWARE=1`.
- WebGPU (`jest-environment-webgpu-node`) additionally needs `mesa-vulkan-drivers`, because Dawn needs Vulkan.

macOS runners use Metal and need no extra setup. This repository's CI runs on macOS, Ubuntu and Windows, and installs the packages above on Ubuntu only. macOS and Windows use prebuilt binaries.

## GitHub Actions

This is the pattern from jest-gpu's own [CI workflow](https://github.com/bhouston/jest-gpu/blob/main/.github/workflows/ci.yml), which runs WebGPU tests for real, not mocked, on `ubuntu-latest` for every pull request:

```yaml
env:
  LIBGL_ALWAYS_SOFTWARE: '1'
steps:
  - uses: actions/checkout@v6
  - if: runner.os == 'Linux'
    run: sudo apt-get update && sudo apt-get install -y libegl1 libgles2 libgl1-mesa-dri mesa-vulkan-drivers
  - run: pnpm install --frozen-lockfile
  - run: pnpm exec jest
```

## Pin the backend

On Linux you can tell Dawn which backend to use with `dawnOptions`, for example `['backend=vulkan']`; see [WebGPU](./webgpu.md). For WebGL, `backend` and `api` are passed to node-webgl; see [WebGL](./webgl.md).
