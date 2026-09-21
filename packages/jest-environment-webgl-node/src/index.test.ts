import { TestEnvironment } from 'jest-environment-node';
import { describe, expect, it } from '@jest/globals';
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
