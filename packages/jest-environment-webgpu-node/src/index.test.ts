import { expect, it } from '@jest/globals';
import WebgpuEnvironment, { HeadlessCanvas } from './index.js';

const makeEnv = (testEnvironmentOptions: Record<string, unknown> = { dawnOptions: [] }) =>
  new WebgpuEnvironment({ projectConfig: { testEnvironmentOptions } as any, globalConfig: {} as any }, {
    console,
    docblockPragmas: {},
    testPath: import.meta.filename,
  } as any);

it('adds navigator.gpu backed by Dawn, the GPU* globals, createCanvas and a canvas shim, and removes them on teardown', async () => {
  const env = makeEnv();
  const global = env.global as any;

  // pre-existing globals (e.g. Node's own) are untouched
  expect(typeof global.process).toBe('object');
  expect(typeof global.Object).toBe('function');

  expect(global.GPUBufferUsage.MAP_READ).toBe(1);
  expect(global.HTMLCanvasElement).toBe(HeadlessCanvas);
  expect(typeof global.createCanvas).toBe('function');
  expect(global.createCanvas(4, 4)).toBeInstanceOf(HeadlessCanvas);
  expect(global.document.createElement('canvas')).toBeInstanceOf(HeadlessCanvas);
  expect(global.document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas')).toBeInstanceOf(HeadlessCanvas);
  expect(global.document.createElement('div')).toEqual({});
  expect(global.document.createElementNS('', 'div')).toEqual({});
  expect(global.self).toBe(global.window);
  expect(global.window.devicePixelRatio).toBe(1);
  await new Promise<number>((resolve) => global.requestAnimationFrame(resolve));
  global.cancelAnimationFrame(global.window.requestAnimationFrame(() => {}));
  global.document.addEventListener();
  global.document.removeEventListener();
  global.window.addEventListener();
  global.window.removeEventListener();

  const adapter = await global.navigator.gpu.requestAdapter();
  expect(adapter).not.toBeNull();
  const device = await adapter.requestDevice();
  const buffer = device.createBuffer({
    size: 16,
    usage: global.GPUBufferUsage.COPY_DST | global.GPUBufferUsage.MAP_READ,
  });
  device.queue.writeBuffer(buffer, 0, new Uint32Array([1, 2, 3, 4]));
  await buffer.mapAsync(global.GPUMapMode.READ);
  expect(Array.from(new Uint32Array(buffer.getMappedRange()))).toEqual([1, 2, 3, 4]);
  buffer.unmap();
  device.destroy();

  await env.teardown();
  expect(global.navigator.gpu).toBeUndefined();
  expect(global.GPUBufferUsage).toBeUndefined();
  expect(global.createCanvas).toBeUndefined();
  expect(global.HTMLCanvasElement).toBeUndefined();
  expect(typeof global.process).toBe('object');
});

it('reuses an existing navigator object and defaults dawnOptions when omitted', async () => {
  const env = makeEnv({});
  const global = env.global as any;
  const navigator = global.navigator;
  expect(navigator).toBeDefined();
  expect(typeof global.navigator.gpu.requestAdapter).toBe('function');
  await env.teardown();
  expect(global.navigator).toBe(navigator);
  expect(global.navigator.gpu).toBeUndefined();
});
