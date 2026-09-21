import { expect, it } from '@jest/globals';

// Baby step 5: Babylon.js WebGL Engine renders into the same real GL context; read pixels back to
// prove the lit box actually rendered, no screenshot matcher (see CONTRIBUTING).
it('renders a lit box with Babylon.js WebGL Engine', async () => {
  // @babylonjs/core defines a `_native` accessor property on `self` as a module-load side effect
  // (BabylonNative detection), guarded by `!hasOwnProperty(self, '_native')`. Jest's sandbox
  // global is a Proxy over the VM context global, and that defineProperty call fails there with
  // "'defineProperty' on proxy: trap returned truish for adding property '_native' that is
  // incompatible with the existing property in the proxy target". Pre-seeding the own property
  // satisfies the guard and skips the failing defineProperty. Must run before the (hoisted)
  // static import evaluates babylon's module, hence the dynamic import below.
  (globalThis as unknown as { _native?: unknown })._native = undefined;
  const { ArcRotateCamera, Engine, HemisphericLight, MeshBuilder, Scene, Vector3 } = await import('@babylonjs/core');

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  // node-webgl's Canvas is not an HTMLCanvasElement to TypeScript, but it has everything Babylon uses at runtime.
  const engine = new Engine(canvas as unknown as HTMLCanvasElement, true);
  const scene = new Scene(engine);
  scene.activeCamera = new ArcRotateCamera('camera', Math.PI / 3, Math.PI / 3, 4, Vector3.Zero(), scene);
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  light.intensity = 1;
  MeshBuilder.CreateBox('box', { size: 1 }, scene);
  await scene.whenReadyAsync(); // shaders compile asynchronously (KHR_parallel_shader_compile)
  scene.render();

  const gl = canvas.getContext('webgl2')!;
  const center = new Uint8Array(4);
  gl.readPixels(size / 2, size / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, center);
  const corner = new Uint8Array(4);
  gl.readPixels(1, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, corner);
  expect(center[3]).toBe(255); // the box is opaque
  expect(corner[3]).toBe(255); // the clear colour is opaque too
  // The lit box in the centre differs from the untouched clear-colour background in a corner.
  expect(Array.from(center)).not.toEqual(Array.from(corner));
  engine.dispose();
});
