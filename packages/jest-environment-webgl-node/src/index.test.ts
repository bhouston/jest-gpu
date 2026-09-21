import { getDisplayInfo } from '@onirenaud/node-webgl';
import { TestEnvironment } from 'jest-environment-node';
import { describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import WebglEnvironment from './index.js';

const listener = () => {};

function makeEnv(testEnvironmentOptions: Record<string, unknown> = {}) {
  return new WebglEnvironment(
    { projectConfig: { testEnvironmentOptions }, globalConfig: {} } as any,
    { console, docblockPragmas: {}, testPath: import.meta.filename } as any,
  );
}

describe('WebglEnvironment', () => {
  it('installs the DOM shim with a real WebGL2 canvas and removes it on teardown', async () => {
    const env = makeEnv({ innerWidth: 320, api: 'auto' });
    const { window, document } = env.global as unknown as {
      window: typeof globalThis;
      document: Document;
    };

    expect((window as unknown as { innerWidth: number }).innerWidth).toBe(320);
    expect(window).toBe(env.global);
    expect((env.global as unknown as { self: unknown }).self).toBe(env.global);

    window.addEventListener('resize', listener);
    document.addEventListener('visibilitychange', listener);
    window.removeEventListener('resize', listener);
    document.removeEventListener('visibilitychange', listener);

    const canvas = (document as unknown as { createElement: (tag: string) => any }).createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const gl = canvas.getContext('webgl2');
    expect(gl).toBeTruthy();
    gl.clearColor(1, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const pixels = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    expect(Array.from(pixels)).toEqual([255, 0, 0, 255]);

    await env.teardown();

    const fresh = new TestEnvironment(
      { projectConfig: { testEnvironmentOptions: {} }, globalConfig: {} } as any,
      { console, docblockPragmas: {}, testPath: import.meta.filename } as any,
    );
    expect((fresh.global as unknown as { document?: unknown }).document).toBeUndefined();
    expect((env.global as unknown as { document?: unknown }).document).toBeUndefined();
    expect((env.global as unknown as { window?: unknown }).window).toBeUndefined();
    await fresh.teardown();
  });

  it('is idempotent: two environments constructed in a row both get the DOM shim', async () => {
    const envA = makeEnv();
    const envB = makeEnv();

    for (const env of [envA, envB]) {
      const { document } = env.global as unknown as { document: { createElement: (t: string) => any } };
      expect(document).toBeDefined();
      const canvas = document.createElement('canvas');
      expect((env.global as unknown as { HTMLCanvasElement: unknown }).HTMLCanvasElement).toBeDefined();
      expect(canvas).toBeInstanceOf(
        (env.global as unknown as { HTMLCanvasElement: new (...args: unknown[]) => unknown }).HTMLCanvasElement,
      );
    }

    await envA.teardown();
    await envB.teardown();
  });

  it('creates isolated document and window event state for every environment', async () => {
    const envA = makeEnv({ document: 'preexisting', innerWidth: 111 });
    const envB = makeEnv({ innerWidth: 222 });
    const a = envA.global as unknown as typeof globalThis;
    const b = envB.global as unknown as typeof globalThis;
    const onResize = jest.fn();
    const onVisibility = jest.fn();

    a.document.title = 'changed';
    a.document.body.setAttribute('data-suite', 'a');
    a.addEventListener('resize', onResize);
    a.document.addEventListener('visibilitychange', onVisibility);

    b.dispatchEvent(new Event('resize'));
    b.document.dispatchEvent(new Event('visibilitychange'));
    expect(onResize).not.toHaveBeenCalled();
    expect(onVisibility).not.toHaveBeenCalled();
    expect(b.document.title).toBe('');
    expect(b.document.body.getAttribute('data-suite')).toBeNull();
    expect(a.document).not.toBe(b.document);
    expect(a.document.body).not.toBe(b.document.body);
    expect(a.document.defaultView).toBe(a);
    expect(b.document.defaultView).toBe(b);
    expect(a.innerWidth).toBe(111);
    expect(b.innerWidth).toBe(222);

    await envA.teardown();
    await envB.teardown();
  });

  it('restores a pre-existing host DOM descriptor and still installs a fresh sandbox DOM', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const hostDocument = { host: true };
    Object.defineProperty(globalThis, 'document', {
      value: hostDocument,
      writable: true,
      configurable: true,
      enumerable: true,
    });

    try {
      const env = makeEnv();
      expect((env.global as unknown as { document: unknown }).document).not.toBe(hostDocument);
      expect(globalThis.document).toBe(hostDocument);
      expect(Object.getOwnPropertyDescriptor(globalThis, 'document')).toEqual({
        value: hostDocument,
        writable: true,
        configurable: true,
        enumerable: true,
      });
      await env.teardown();
      expect(globalThis.document).toBe(hostDocument);
    } finally {
      if (original) Object.defineProperty(globalThis, 'document', original);
      else delete (globalThis as { document?: unknown }).document;
    }
  });

  it.each([undefined, true])('uses per-environment file fetch when fetch is %s', async (fetch) => {
    const baseDir = fileURLToPath(new URL('..', import.meta.url));
    const env = makeEnv({ baseDir, ...(fetch === undefined ? {} : { fetch }) });
    const sandboxFetch = (env.global as unknown as { fetch: typeof globalThis.fetch }).fetch;
    const response = await sandboxFetch('README.md');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(await response.text()).toContain('# jest-environment-webgl-node');
    expect(globalThis.fetch).not.toBe(sandboxFetch);
    await env.teardown();
  });

  it('supports file URLs, known MIME types, missing files, and native URL schemes', async () => {
    const baseDir = fileURLToPath(new URL('..', import.meta.url));
    const env = makeEnv({ baseDir });
    const sandboxFetch = (env.global as unknown as { fetch: typeof globalThis.fetch }).fetch;

    const packageResponse = await sandboxFetch(new URL('../package.json', import.meta.url));
    expect(packageResponse.status).toBe(200);
    expect(packageResponse.headers.get('content-type')).toBe('application/json');
    const missing = await sandboxFetch('missing.txt?cache=no');
    expect(missing.status).toBe(404);
    const nativeUrl = await sandboxFetch(new URL('data:text/plain,url'));
    expect(await nativeUrl.text()).toBe('url');
    const nativeRequest = await sandboxFetch(new Request('data:text/plain,request'));
    expect(await nativeRequest.text()).toBe('request');

    await env.teardown();
  });

  it('keeps native fetch when file fetch is disabled', async () => {
    const env = makeEnv({ fetch: false });
    const sandboxFetch = (env.global as unknown as { fetch: typeof globalThis.fetch }).fetch;
    const response = await sandboxFetch('data:text/plain,native');

    expect(typeof sandboxFetch).toBe('function');
    expect(await response.text()).toBe('native');
    await expect(sandboxFetch('README.md')).rejects.toThrow();
    expect(globalThis.fetch).toBeDefined();
    await env.teardown();
  });

  it('applies a different file-fetch base directory to each environment', async () => {
    const packageDir = fileURLToPath(new URL('..', import.meta.url));
    const sourceDir = fileURLToPath(new URL('.', import.meta.url));
    const packageEnv = makeEnv({ baseDir: packageDir });
    const sourceEnv = makeEnv({ baseDir: sourceDir });
    const packageFetch = (packageEnv.global as unknown as { fetch: typeof fetch }).fetch;
    const sourceFetch = (sourceEnv.global as unknown as { fetch: typeof fetch }).fetch;

    expect((await packageFetch('README.md')).status).toBe(200);
    expect((await packageFetch('index.ts')).status).toBe(404);
    expect((await sourceFetch('README.md')).status).toBe(404);
    expect((await sourceFetch('index.ts')).status).toBe(200);
    await packageEnv.teardown();
    await sourceEnv.teardown();
  });

  it('runs and cancels animation frames through modern fake timers', async () => {
    const env = makeEnv({ frameInterval: 20 });
    const g = env.global as unknown as typeof globalThis;
    const callback = jest.fn();
    env.fakeTimersModern.useFakeTimers();

    const cancelled = g.requestAnimationFrame(callback);
    g.cancelAnimationFrame(cancelled);
    g.cancelAnimationFrame(12345);
    env.fakeTimersModern.advanceTimersByTime(20);
    expect(callback).not.toHaveBeenCalled();

    g.requestAnimationFrame(callback);
    env.fakeTimersModern.advanceTimersByTime(19);
    expect(callback).not.toHaveBeenCalled();
    env.fakeTimersModern.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(expect.any(Number));
    await env.teardown();
  });

  it('cancels pending frames with the clearTimeout active when they were scheduled', async () => {
    const env = makeEnv();
    const g = env.global as unknown as Record<string, any>;
    const scheduledClear = jest.fn();
    g.setTimeout = jest.fn(() => 42);
    g.clearTimeout = scheduledClear;
    g.requestAnimationFrame(listener);
    g.clearTimeout = jest.fn();

    await env.teardown();
    expect(scheduledClear).toHaveBeenCalledWith(42);
  });

  it('prevents a real pending animation frame from firing after teardown', async () => {
    const env = makeEnv({ frameInterval: 5 });
    const callback = jest.fn();
    (env.global as unknown as typeof globalThis).requestAnimationFrame(callback);

    await env.teardown();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(callback).not.toHaveBeenCalled();
  });

  it('rejects options that disagree with the display already initialized in this worker', async () => {
    // Earlier tests created contexts, so the display exists even though no environment passed options.
    const display = getDisplayInfo()!;
    expect(display).toBeTruthy();
    const otherBackend = display.backend === 'null' ? 'swiftshader' : 'null';
    const otherApi = display.api === 'gles' ? 'gl' : 'gles';
    expect(() => makeEnv({ backend: otherBackend })).toThrow('cannot switch this Jest worker');
    expect(() => makeEnv({ api: otherApi })).toThrow('cannot switch this Jest worker');
    expect(getDisplayInfo()).toBe(display);
  });

  it('accepts options that match the initialized display, and the platform defaults', async () => {
    const display = getDisplayInfo()!;
    const envs = [
      makeEnv({ backend: display.backend, api: display.api }),
      makeEnv({ backend: display.backend, api: display.api }),
      makeEnv({ backend: 'default', api: 'auto' }),
    ];
    for (const env of envs) await env.teardown();
    expect(getDisplayInfo()).toBe(display);
  });

  // Assertions here use `Object.getOwnPropertyNames` rather than `Object.hasOwn`/`in`: reads of a
  // freshly-added property from outside jest-environment-node's proxied sandbox global (as here)
  // give false negatives for those, though the property is genuinely present (and visible from
  // inside the sandbox, which is what matters for Babylon.js's own hasOwnProperty guard).
  it('pre-seeds an own `_native` property for Babylon.js and removes it on teardown', async () => {
    const env = makeEnv();
    const g = env.global as unknown as Record<string, unknown>;
    expect(Object.getOwnPropertyNames(g)).toContain('_native');
    expect(g._native).toBeUndefined();

    await env.teardown();

    expect(Object.getOwnPropertyNames(g)).not.toContain('_native');
  });

  it('leaves a pre-existing `_native` property alone', async () => {
    // `testEnvironmentOptions` is assigned onto the sandbox global before jest-environment-node's
    // constructor returns, so this simulates `_native` already being an own property when our
    // constructor's guard runs, as it would be if some earlier module had defined it.
    const env = makeEnv({ _native: 'preexisting' });
    const g = env.global as unknown as Record<string, unknown>;
    expect(g._native).toBe('preexisting');

    await env.teardown();

    expect(Object.getOwnPropertyNames(g)).toContain('_native');
    expect(g._native).toBe('preexisting');
  });
});
