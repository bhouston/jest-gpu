import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

for (const api of ['webgl', 'webgpu']) {
  test(`${api}: real Jest suites isolate DOM state and support fake animation timers`, async () => {
    const fixture = await mkdtemp(join(tmpdir(), `jest-gpu-${api}-`));
    try {
      await writeFile(
        join(fixture, 'sequencer.cjs'),
        `module.exports = class {
  sort(tests) { return tests.sort((a, b) => a.path.localeCompare(b.path)); }
  cacheResults() {}
};\n`,
      );
      await writeFile(
        join(fixture, '01-mutate.test.cjs'),
        `test('mutates the first suite document', () => {
  document.reviewMarker = 'first suite';
  document.addEventListener('review', () => { document.listenerMarker = true; });
});\n`,
      );
      await writeFile(
        join(fixture, '02-clean.test.cjs'),
        `test('starts with a fresh document and consistent global aliases', () => {
  expect(document.reviewMarker).toBeUndefined();
  ${api === 'webgl' ? "document.dispatchEvent(new Event('review'));" : ''}
  expect(document.listenerMarker).toBeUndefined();
  expect(window === globalThis).toBe(true);
  expect(self === globalThis).toBe(true);
  expect(window.document).toBe(document);
  ${api === 'webgpu' ? 'expect(self.navigator.gpu).toBe(navigator.gpu);' : 'expect(document.defaultView === globalThis).toBe(true);'}
});
test.each([false, true])('animation frames follow fake timers (legacy=%s)', (legacyFakeTimers) => {
  jest.useFakeTimers({ legacyFakeTimers });
  try {
    const callback = jest.fn();
    const cancelled = jest.fn();
    requestAnimationFrame(callback);
    cancelAnimationFrame(requestAnimationFrame(cancelled));
    jest.advanceTimersByTime(20);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(cancelled).not.toHaveBeenCalled();
  } finally {
    jest.useRealTimers();
  }
});\n`,
      );
      await writeFile(
        join(fixture, 'jest.config.json'),
        JSON.stringify({
          rootDir: fixture,
          testEnvironment: join(root, `packages/jest-environment-${api}-node/dist/index.cjs`),
          testMatch: ['**/*.test.cjs'],
          testSequencer: join(fixture, 'sequencer.cjs'),
          transform: {},
        }),
      );
      const result = spawnSync(
        process.execPath,
        [join(root, 'node_modules/jest/bin/jest.js'), '--config', join(fixture, 'jest.config.json'), '--runInBand'],
        { cwd: fixture, encoding: 'utf8', timeout: 60_000 },
      );
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });
}
