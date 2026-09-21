import { init, installDOM, type InitOptions, type InstallDOMOptions } from '@onirenaud/node-webgl';
import { TestEnvironment } from 'jest-environment-node';

/** Set under `testEnvironmentOptions` in your Jest config. */
export type WebglNodeOptions = InitOptions & InstallDOMOptions;

// Typed from TestEnvironment's own constructor rather than importing `@jest/environment`
// directly: that package is only a transitive dependency (of jest-environment-node), not
// resolvable from this package's own node_modules under pnpm's strict layout.
type JestEnvironmentConfig = ConstructorParameters<typeof TestEnvironment>[0];
type EnvironmentContext = ConstructorParameters<typeof TestEnvironment>[1];

// node-webgl's installDOM() writes to the HOST globalThis (not a target you pass in) and is
// idempotent (it skips names already defined). So it can only usefully run once per process: on
// the first WebglEnvironment constructed here, snapshot the host globals before/after the call and
// remember which names it added. Every later environment (this test file or another one sharing
// the worker) copies that same fixed list into its own sandbox global instead of calling
// installDOM() again. This means only the FIRST test file's `testEnvironmentOptions` actually
// affect the host install (backend/api selection, DOM option defaults); later test files'
// options for those are ignored, matching how node-webgl itself behaves.
let domNames: readonly string[] | undefined;

function ensureHostDOM(options: WebglNodeOptions): readonly string[] {
  if (domNames) return domNames;
  const { backend, api, ...dom } = options;
  if (backend || api) init({ backend, api });
  const before = new Set(Object.getOwnPropertyNames(globalThis));
  installDOM(dom);
  domNames = Object.getOwnPropertyNames(globalThis).filter((key) => !before.has(key));
  return domNames;
}

export default class WebglEnvironment extends TestEnvironment {
  private readonly added: string[];

  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context);
    // Jest always populates `testEnvironmentOptions` (defaulting to `{}`) by the time a real
    // config reaches an environment; `super()` above already relies on that itself.
    const options = config.projectConfig.testEnvironmentOptions as WebglNodeOptions;
    const names = ensureHostDOM(options);
    const g = this.global as unknown as Record<string, unknown>;
    this.added = names.filter((key) => !(key in g));
    for (const key of this.added) g[key] = (globalThis as unknown as Record<string, unknown>)[key];
    g.window = g;
    g.self = g;
    // node-webgl's window/document have no event methods; engines like Babylon.js register
    // resize/blur listeners on them. installDOM() always installs both, so both are present here.
    for (const target of [g.window, g.document] as Record<string, unknown>[]) {
      target.addEventListener ??= () => {};
      target.removeEventListener ??= () => {};
    }
  }

  override async teardown(): Promise<void> {
    const g = this.global as unknown as Record<string, unknown>;
    for (const key of this.added) delete g[key];
    await super.teardown();
  }
}
