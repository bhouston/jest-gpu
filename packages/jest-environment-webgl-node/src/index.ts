import { readFile } from 'node:fs/promises';
import { extname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as nodeWebGL from '@onirenaud/node-webgl';
import type { InitOptions, InstallDOMOptions } from '@onirenaud/node-webgl';
import { TestEnvironment } from 'jest-environment-node';

/** Set under `testEnvironmentOptions` in your Jest config. */
export type WebglNodeOptions = InitOptions & InstallDOMOptions;

type JestEnvironmentConfig = ConstructorParameters<typeof TestEnvironment>[0];
type EnvironmentContext = ConstructorParameters<typeof TestEnvironment>[1];
type Sandbox = Record<string, unknown>;

const WEBGL_OPTION_NAMES = new Set([
  'api',
  'backend',
  'baseDir',
  'devicePixelRatio',
  'fetch',
  'frameInterval',
  'innerHeight',
  'innerWidth',
]);

const MIME: Record<string, string> = {
  '.basis': 'application/octet-stream',
  '.bin': 'application/octet-stream',
  '.drc': 'application/octet-stream',
  '.exr': 'image/x-exr',
  '.fbx': 'application/octet-stream',
  '.gif': 'image/gif',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.hdr': 'image/vnd.radiance',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.ktx': 'image/ktx',
  '.ktx2': 'image/ktx2',
  '.mjs': 'text/javascript',
  '.mtl': 'text/plain',
  '.obj': 'text/plain',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
};

const DOM_NAMES = [
  'window',
  'self',
  'HTMLCanvasElement',
  'OffscreenCanvas',
  'HTMLImageElement',
  'Image',
  'ImageData',
  'ImageBitmap',
  'createImageBitmap',
  'FileReader',
  'HTMLElement',
  'Element',
  'Node',
  'devicePixelRatio',
  'innerWidth',
  'innerHeight',
  'screen',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
  'matchMedia',
  'scrollTo',
  'alert',
  'location',
  'document',
  ...Object.keys(nodeWebGL).filter((name) => name.startsWith('WebGL')),
] as const;

let initializedWith: InitOptions | undefined;

function initialize(options: InitOptions): void {
  if (!options.api && !options.backend) return;
  if (initializedWith && (options.api !== initializedWith.api || options.backend !== initializedWith.backend)) {
    throw new Error(
      `node-webgl is already initialized with ${JSON.stringify(initializedWith)}; ` +
        `cannot switch this Jest worker to ${JSON.stringify(options)}`,
    );
  }
  nodeWebGL.init(options);
  initializedWith = options;
}

/** Capture a fresh node-webgl DOM while restoring every host descriptor after installation. */
function createDOM(options: InstallDOMOptions): Map<string, PropertyDescriptor> {
  const before = Object.getOwnPropertyDescriptors(globalThis);
  for (const name of DOM_NAMES) Reflect.deleteProperty(globalThis, name);

  try {
    nodeWebGL.installDOM({ ...options, fetch: false });
    const after = Object.getOwnPropertyDescriptors(globalThis);
    return new Map(
      DOM_NAMES.flatMap((name): [string, PropertyDescriptor][] => (after[name] ? [[name, after[name]]] : [])),
    );
  } finally {
    for (const name of Object.getOwnPropertyNames(globalThis)) {
      if (!(name in before)) Reflect.deleteProperty(globalThis, name);
    }
    Object.defineProperties(globalThis, before);
  }
}

function environmentConfig(config: JestEnvironmentConfig): JestEnvironmentConfig {
  return {
    ...config,
    projectConfig: {
      ...config.projectConfig,
      testEnvironmentOptions: Object.fromEntries(
        Object.entries(config.projectConfig.testEnvironmentOptions).filter(([name]) => !WEBGL_OPTION_NAMES.has(name)),
      ),
    },
  };
}

function localFetch(baseDir: string, nativeFetch: typeof fetch): typeof fetch {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (/^(https?|data|blob):/i.test(url)) return nativeFetch(input, init);
    const path = url.startsWith('file:') ? fileURLToPath(url) : resolvePath(baseDir, url.replace(/[?#].*$/, ''));
    try {
      const bytes = await readFile(path);
      return new Response(bytes, {
        status: 200,
        headers: { 'content-type': MIME[extname(path).toLowerCase()] ?? 'application/octet-stream' },
      });
    } catch {
      return new Response(null, { status: 404, statusText: 'Not Found' });
    }
  };
}

export default class WebglEnvironment extends TestEnvironment {
  private readonly added: string[] = [];
  private readonly animationFrames = new Map<ReturnType<typeof setTimeout>, typeof clearTimeout>();

  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    const options = config.projectConfig.testEnvironmentOptions as WebglNodeOptions;
    super(environmentConfig(config), context);

    const { api, backend, ...domOptions } = options;
    initialize({ api, backend });

    const g = this.global as unknown as Sandbox;
    const nativeAdded = !Object.getOwnPropertyNames(g).includes('_native');
    if (nativeAdded) {
      Object.defineProperty(g, '_native', {
        value: undefined,
        writable: true,
        configurable: true,
        enumerable: false,
      });
      this.added.push('_native');
    }

    for (const [name, descriptor] of createDOM(domOptions)) {
      if (!(name in g)) this.added.push(name);
      Object.defineProperty(g, name, descriptor);
    }

    g.window = g;
    g.self = g;
    (g.document as Record<string, unknown>).defaultView = g;

    const events = new EventTarget();
    g.addEventListener = events.addEventListener.bind(events);
    g.removeEventListener = events.removeEventListener.bind(events);
    g.dispatchEvent = events.dispatchEvent.bind(events);
    this.added.push('addEventListener', 'removeEventListener', 'dispatchEvent');

    const interval = domOptions.frameInterval ?? 16;
    g.requestAnimationFrame = (callback: (time: number) => void) => {
      const id = (g.setTimeout as typeof setTimeout)(() => {
        this.animationFrames.delete(id);
        callback((g.performance as { now(): number }).now());
      }, interval);
      this.animationFrames.set(id, g.clearTimeout as typeof clearTimeout);
      return id;
    };
    g.cancelAnimationFrame = (id: ReturnType<typeof setTimeout>) => {
      const clear = this.animationFrames.get(id);
      this.animationFrames.delete(id);
      (clear ?? (g.clearTimeout as typeof clearTimeout))(id);
    };

    const nativeFetch = globalThis.fetch.bind(globalThis);
    g.fetch = domOptions.fetch === false ? nativeFetch : localFetch(domOptions.baseDir ?? process.cwd(), nativeFetch);
  }

  override async teardown(): Promise<void> {
    const g = this.global as unknown as Sandbox;
    for (const [id, clear] of this.animationFrames) clear(id);
    this.animationFrames.clear();
    for (const key of this.added) delete g[key];
    await super.teardown();
  }
}
