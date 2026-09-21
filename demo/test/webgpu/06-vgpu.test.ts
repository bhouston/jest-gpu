import { expect, it } from '@jest/globals';
import { effect, frame, init, target } from 'vgpu';

// vgpu's browser entry point finds the environment's navigator.gpu; no vgpu/node or Dawn download needed.
it('renders a fullscreen effect with vgpu and reads the target back', async () => {
  const gpu = await init();
  const size = 64;
  const colorTarget = target(gpu, { size: [size, size], format: 'rgba8unorm' });
  const gradient = effect(
    gpu,
    /* wgsl */ `@fragment fn fs(@builtin(position) p: vec4f) -> @location(0) vec4f { return vec4f(p.xy / ${size}.0, 0.0, 1.0); }`,
  );
  frame(gpu, (f) => f.pass(colorTarget, gradient));
  const data = new Uint8Array(await colorTarget.color.read({ mipLevel: 0, region: 'all' }));
  expect(data.length).toBe(size * size * 4);

  // A smooth gradient from black (top-left) toward (0.5, 0.5, 0, 1) at the centre.
  const corner = 0;
  expect(data[corner]).toBeLessThan(10);
  expect(data[corner + 1]).toBeLessThan(10);
  expect(data[corner + 2]).toBe(0);
  expect(data[corner + 3]).toBe(255);

  const center = ((size / 2) * size + size / 2) * 4;
  expect(data[center]!).toBeGreaterThan(110);
  expect(data[center]!).toBeLessThan(145);
  expect(data[center + 1]!).toBeGreaterThan(110);
  expect(data[center + 1]!).toBeLessThan(145);
  expect(data[center + 2]).toBe(0);
  expect(data[center + 3]).toBe(255);
  gpu.dispose();
});
