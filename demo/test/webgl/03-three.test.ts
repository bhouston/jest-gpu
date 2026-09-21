import * as THREE from 'three';
import { expect, it } from '@jest/globals';

// Baby step 4: three.js WebGLRenderer draws into the environment's real GL context; read pixels
// back to prove it actually rendered (no screenshot matcher here, see CONTRIBUTING).
it('renders a three.js torus knot with WebGLRenderer', () => {
  const size = 256;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 3;
  scene.add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.7, 0.25, 128, 32), new THREE.MeshNormalMaterial()));
  renderer.render(scene, camera);

  // Read back through the canvas directly (not renderer.getContext()): three.js types that
  // return as the broad lib.dom WebGLRenderingContext | WebGL2RenderingContext union, while the
  // canvas we created is already typed to node-webgl's real context, readPixels included.
  const gl = canvas.getContext('webgl2')!;
  // A corner is untouched background: the explicit black clear colour.
  const corner = new Uint8Array(4);
  gl.readPixels(1, 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, corner);
  expect(Array.from(corner)).toEqual([0, 0, 0, 255]);

  // The torus knot has a hole through its middle, so the exact centre pixel isn't reliably
  // covered; count how many pixels differ from the background colour instead, to prove a
  // meaningful area of the frame actually got MeshNormalMaterial colours drawn into it.
  const frame = new Uint8Array(size * size * 4);
  gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, frame);
  let covered = 0;
  for (let i = 0; i < frame.length; i += 4) {
    if (frame[i] !== corner[0] || frame[i + 1] !== corner[1] || frame[i + 2] !== corner[2]) covered++;
  }
  expect(covered).toBeGreaterThan(size * size * 0.1);
  renderer.dispose();
});
