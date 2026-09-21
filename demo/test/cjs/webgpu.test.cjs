// Plain CommonJS, run WITHOUT --experimental-vm-modules: proves `require('jest-environment-webgpu-node')`
// works from a CJS test file (jestjs/jest#15716 blocks this for ESM-only packages).
const { createCanvas } = require('jest-environment-webgpu-node');

test('clears a headless canvas to a colour and reads it back', async () => {
  const size = 8;
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('webgpu');
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      { view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: [1, 0, 0, 1] },
    ],
  });
  pass.end();
  device.queue.submit([encoder.finish()]);

  const { width, height, data } = await canvas.readPixels();
  expect(width).toBe(size);
  expect(height).toBe(size);
  expect(Array.from(data.subarray(0, 4))).toEqual([255, 0, 0, 255]);
  device.destroy();
});
