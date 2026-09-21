import { expect, it, jest } from '@jest/globals';
import WebgpuEnvironment, { HeadlessCanvas } from './index.js';

const makeEnv = async (testEnvironmentOptions: Record<string, unknown> = { dawnOptions: [] }) => {
  const env = new WebgpuEnvironment({ projectConfig: { testEnvironmentOptions } as any, globalConfig: {} as any }, {
    console,
    docblockPragmas: {},
    testPath: import.meta.filename,
  } as any);
  await env.setup();
  return env;
};

it('adds navigator.gpu backed by Dawn, the GPU* globals, createCanvas and a canvas shim, and removes them on teardown', async () => {
  const env = await makeEnv();
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
  expect(global.window).toBe(global);
  expect(global.self).toBe(global);
  expect(global.self).toBe(global.window);
  expect(global.self.navigator).toBe(global.navigator);
  expect(global.window.document).toBe(global.document);
  expect(global.eval('window === globalThis && self.navigator === navigator && window.document === document')).toBe(
    true,
  );
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

it('runs animation frames through Jest fake timers and supports cancellation', async () => {
  const env = await makeEnv();
  const global = env.global as any;
  env.fakeTimersModern!.useFakeTimers({ now: 1000 });
  const callback = jest.fn();

  global.requestAnimationFrame(callback);
  const cancelled = global.window.requestAnimationFrame(callback);
  global.cancelAnimationFrame(cancelled);
  expect(callback).not.toHaveBeenCalled();

  await env.fakeTimersModern!.advanceTimersByTimeAsync(16);
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith(16);
  await env.teardown();
});

it('cancels outstanding animation frames during teardown', async () => {
  const env = await makeEnv();
  const global = env.global as any;
  const timers = env.fakeTimersModern!;
  timers.useFakeTimers();
  const clearTimeout = jest.fn(global.clearTimeout);
  global.clearTimeout = clearTimeout;
  global.requestAnimationFrame(() => {});
  expect(timers.getTimerCount()).toBe(1);

  await env.teardown();

  expect(clearTimeout).toHaveBeenCalledTimes(1);
});

it('reuses an existing navigator object and defaults dawnOptions when omitted', async () => {
  const env = await makeEnv({});
  const global = env.global as any;
  const navigator = global.navigator;
  expect(navigator).toBeDefined();
  expect(typeof global.navigator.gpu.requestAdapter).toBe('function');
  await env.teardown();
  expect(global.navigator).toBe(navigator);
  expect(global.navigator.gpu).toBeUndefined();
});

// Assertions here use `Object.getOwnPropertyNames` rather than `Object.hasOwn`/`in`: reads of a
// freshly-added property from outside jest-environment-node's proxied sandbox global (as here)
// give false negatives for those, though the property is genuinely present (and visible from
// inside the sandbox, which is what matters for Babylon.js's own hasOwnProperty guard).
it('pre-seeds an own `_native` property for Babylon.js and removes it on teardown', async () => {
  const env = await makeEnv();
  const global = env.global as any;
  expect(Object.getOwnPropertyNames(global)).toContain('_native');
  expect(global._native).toBeUndefined();

  await env.teardown();

  expect(Object.getOwnPropertyNames(global)).not.toContain('_native');
});

it('leaves a pre-existing `_native` property alone', async () => {
  // `testEnvironmentOptions` is assigned onto the sandbox global before jest-environment-node's
  // constructor returns, so this simulates `_native` already being an own property when our
  // constructor's guard runs, as it would be if some earlier module had defined it.
  const env = await makeEnv({ dawnOptions: [], _native: 'preexisting' });
  const global = env.global as any;
  expect(global._native).toBe('preexisting');

  await env.teardown();

  expect(Object.getOwnPropertyNames(global)).toContain('_native');
  expect(global._native).toBe('preexisting');
});
