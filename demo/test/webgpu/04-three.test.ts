import * as THREE from 'three/webgpu';
import { expect, it } from '@jest/globals';
import { createCanvas } from 'jest-environment-webgpu-node';

// three.js WebGPURenderer draws into the environment's headless canvas; readPixels() gets the frame back.
it('renders a three.js torus knot with WebGPURenderer', async () => {
  const size = 256;
  const canvas = createCanvas(size, size);
  const renderer = new THREE.WebGPURenderer({ canvas: canvas.asElement(), antialias: true });
  await renderer.init();
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 3;
  scene.add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.7, 0.25, 128, 32), new THREE.MeshNormalMaterial()));
  await renderer.renderAsync(scene, camera);

  const { width, height, data } = await canvas.readPixels();
  const corner = (1 * width + 1) * 4;
  expect(Array.from(data.subarray(corner, corner + 4))).toEqual([0, 0, 0, 255]);

  // The torus knot has a hole through its middle, so the exact centre pixel isn't reliably
  // covered; count how many pixels differ from the background colour instead, to prove a
  // meaningful area of the frame actually got MeshNormalMaterial colours drawn into it.
  let covered = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) covered++;
  }
  expect(covered).toBeGreaterThan(width * height * 0.1);
  renderer.dispose();
});
