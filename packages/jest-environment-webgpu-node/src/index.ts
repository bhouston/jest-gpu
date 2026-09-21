import { TestEnvironment } from 'jest-environment-node';
import { createCanvas, HeadlessCanvas } from './canvas.js';

type JestEnvironmentConfig = ConstructorParameters<typeof TestEnvironment>[0];
type EnvironmentContext = ConstructorParameters<typeof TestEnvironment>[1];

export { createCanvas, HeadlessCanvas, HeadlessCanvasContext, type RgbaImage } from './canvas.js';

/** Set under `testEnvironmentOptions` in your Jest config. */
export type WebgpuNodeOptions = {
  /** Dawn options, e.g. `['backend=vulkan', 'enable-dawn-features=allow_unsafe_apis']`. */
  dawnOptions?: string[];
};

/** Just enough DOM for libraries that make their own canvas and drive a frame loop. Only installed when missing. */
type TimerHandle = ReturnType<typeof setTimeout>;
type SandboxGlobal = Record<string, unknown> & {
  clearTimeout: typeof clearTimeout;
  performance: Performance;
  setTimeout: typeof setTimeout;
};

const domShims = (
  global: SandboxGlobal,
  animationFrames: Map<TimerHandle, typeof clearTimeout>,
): Record<string, unknown> => {
  const requestAnimationFrame = (callback: (time: number) => void): TimerHandle => {
    const handle = global.setTimeout(() => {
      animationFrames.delete(handle);
      callback(global.performance.now());
    }, 16);
    animationFrames.set(handle, global.clearTimeout);
    (handle as NodeJS.Timeout).unref?.();
    return handle;
  };
  const cancelAnimationFrame = (handle: TimerHandle): void => {
    const clear = animationFrames.get(handle) ?? global.clearTimeout;
    animationFrames.delete(handle);
    clear(handle);
  };
  const document = {
    createElement: (tag: string) => (tag === 'canvas' ? new HeadlessCanvas() : {}),
    createElementNS: (_ns: string, tag: string) => (tag === 'canvas' ? new HeadlessCanvas() : {}),
    addEventListener() {},
    removeEventListener() {},
  };
  return {
    document,
    devicePixelRatio: 1,
    requestAnimationFrame,
    cancelAnimationFrame,
    addEventListener() {},
    removeEventListener() {},
    HTMLCanvasElement: HeadlessCanvas,
    window: global,
    self: global,
  };
};

/**
 * Jest environment that puts real headless WebGPU (Dawn via the `webgpu` package) on the sandbox
 * global: `navigator.gpu`, every `GPU*` class and constant, and a `HeadlessCanvas` shim. CommonJS
 * tests can rely on `createCanvas` being a global; ESM tests can also `import` it from this package.
 */
export default class WebgpuEnvironment extends TestEnvironment {
  #added: string[] = [];
  #navigator: { gpu?: GPU } = {};
  #nativeAdded: boolean;
  #dawnOptions: string[] | undefined;
  #animationFrames = new Map<TimerHandle, typeof clearTimeout>();

  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context);
    // @babylonjs/core defines a `_native` accessor on `self` at module load; on Jest's proxied
    // sandbox global that defineProperty violates a proxy invariant, so pre-seed the property to
    // satisfy Babylon's hasOwnProperty guard.
    // `Object.hasOwn`/`in` report false negatives here: jest-environment-node's sandbox global is
    // a Proxy over a vm context, and reads of freshly-added properties from outside the sandbox
    // (as this constructor runs) don't go through the fast path those use. getOwnPropertyNames is
    // unaffected, so use that instead.
    this.#nativeAdded = !Object.getOwnPropertyNames(this.global).includes('_native');
    if (this.#nativeAdded) {
      Object.defineProperty(this.global, '_native', {
        value: undefined,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
    this.#dawnOptions = config.projectConfig.testEnvironmentOptions.dawnOptions as string[] | undefined;
  }

  // `webgpu` is ESM-only. Loading it via a dynamic import here (rather than a static top-level
  // import) keeps it out of this module's own top-level module graph, so a CommonJS test file's
  // `require('jest-environment-webgpu-node')` - which only needs `createCanvas` - never forces
  // Jest's sandboxed CJS loader to load an ESM-only dependency (jestjs/jest#15716). This method
  // itself runs outside that sandbox, through Jest's own environment setup, where Node's native
  // `import()` always works.
  override async setup(): Promise<void> {
    await super.setup();
    const { create, globals } = await import('webgpu');
    const global = this.global as unknown as SandboxGlobal;
    const shims = { ...globals, ...domShims(global, this.#animationFrames), createCanvas } as Record<string, unknown>;
    this.#added = Object.keys(shims).filter((key) => !(key in global));
    for (const key of this.#added) global[key] = shims[key];
    if (this.#nativeAdded) this.#added.push('_native');
    this.#navigator = (global.navigator ??= {}) as { gpu?: GPU };
    Object.defineProperty(this.#navigator, 'gpu', { value: create(this.#dawnOptions ?? []), configurable: true });
  }

  override async teardown(): Promise<void> {
    const global = this.global as unknown as Record<string, unknown>;
    for (const [handle, clear] of this.#animationFrames) clear(handle);
    this.#animationFrames.clear();
    delete this.#navigator.gpu;
    for (const key of this.#added) delete global[key];
    await super.teardown();
  }
}
