import { TestEnvironment } from 'jest-environment-node';
import { create, globals } from 'webgpu';
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
const requestAnimationFrame = (callback: (time: number) => void): NodeJS.Timeout =>
  setTimeout(() => callback(performance.now()), 16).unref();

const domShims = (): Record<string, unknown> => {
  const window = {
    devicePixelRatio: 1,
    requestAnimationFrame,
    cancelAnimationFrame: clearTimeout,
    addEventListener() {},
    removeEventListener() {},
  };
  return {
    HTMLCanvasElement: HeadlessCanvas,
    document: {
      createElement: (tag: string) => (tag === 'canvas' ? new HeadlessCanvas() : {}),
      createElementNS: (_ns: string, tag: string) => (tag === 'canvas' ? new HeadlessCanvas() : {}),
      addEventListener() {},
      removeEventListener() {},
    },
    window,
    self: window,
    requestAnimationFrame,
    cancelAnimationFrame: clearTimeout,
  };
};

/**
 * Jest environment that puts real headless WebGPU (Dawn via the `webgpu` package) on the sandbox
 * global: `navigator.gpu`, every `GPU*` class and constant, and a `HeadlessCanvas` shim. CommonJS
 * tests can rely on `createCanvas` being a global; ESM tests can also `import` it from this package.
 */
export default class WebgpuEnvironment extends TestEnvironment {
  #added: string[];
  #navigator: { gpu?: GPU };

  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context);
    // @babylonjs/core defines a `_native` accessor on `self` at module load; on Jest's proxied
    // sandbox global that defineProperty violates a proxy invariant, so pre-seed the property to
    // satisfy Babylon's hasOwnProperty guard.
    // `Object.hasOwn`/`in` report false negatives here: jest-environment-node's sandbox global is
    // a Proxy over a vm context, and reads of freshly-added properties from outside the sandbox
    // (as this constructor runs) don't go through the fast path those use. getOwnPropertyNames is
    // unaffected, so use that instead.
    const nativeAdded = !Object.getOwnPropertyNames(this.global).includes('_native');
    if (nativeAdded) {
      Object.defineProperty(this.global, '_native', {
        value: undefined,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
    const global = this.global as unknown as Record<string, unknown>;
    const shims = { ...globals, ...domShims(), createCanvas } as Record<string, unknown>;
    this.#added = Object.keys(shims).filter((key) => !(key in global));
    for (const key of this.#added) global[key] = shims[key];
    if (nativeAdded) this.#added.push('_native');
    this.#navigator = (global.navigator ??= {}) as { gpu?: GPU };
    const dawnOptions = config.projectConfig.testEnvironmentOptions.dawnOptions as string[] | undefined;
    Object.defineProperty(this.#navigator, 'gpu', { value: create(dawnOptions ?? []), configurable: true });
  }

  override async teardown(): Promise<void> {
    delete this.#navigator.gpu;
    const global = this.global as unknown as Record<string, unknown>;
    for (const key of this.#added) delete global[key];
    await super.teardown();
  }
}
