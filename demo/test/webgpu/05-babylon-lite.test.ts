import {
  addToScene,
  createBox,
  createDefaultCamera,
  createEngine,
  createHemisphericLight,
  createSceneContext,
  createStandardMaterial,
  disposeEngine,
  registerScene,
  renderFrame,
  waitForGpuIdle,
} from '@babylonjs/lite';
import { expect, it } from '@jest/globals';
import { createCanvas } from 'jest-environment-webgpu-node';

it('renders a lit box with Babylon Lite', async () => {
  const size = 256;
  const canvas = createCanvas(size, size);
  const engine = await createEngine(canvas.asElement());
  const scene = createSceneContext(engine);
  const box = createBox(engine, 1);
  box.material = createStandardMaterial(); // meshes without a material are not drawn
  addToScene(scene, box);
  addToScene(scene, createHemisphericLight([0, 1, 0], 1));
  const camera = createDefaultCamera(scene); // frames the scene and becomes the active camera
  camera.alpha = Math.PI / 3;
  camera.beta = Math.PI / 3;
  await registerScene(scene);
  // Pipelines compile asynchronously; render a few frames until the box is in.
  for (let i = 0; i < 3; i++) {
    renderFrame(engine, 16);
    await waitForGpuIdle(engine);
  }

  const { width, data } = await canvas.readPixels();
  const center = ((size / 2) * width + size / 2) * 4;
  const corner = (1 * width + 1) * 4;
  expect(data[center + 3]).toBe(255); // the box is opaque
  expect(data[corner + 3]).toBe(255); // the clear colour is opaque too
  // The lit box in the centre differs from the untouched clear-colour background in a corner.
  expect(Array.from(data.subarray(center, center + 4))).not.toEqual(Array.from(data.subarray(corner, corner + 4)));
  disposeEngine(engine);
});
