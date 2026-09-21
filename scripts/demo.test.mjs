import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';

const repository = dirname(dirname(fileURLToPath(import.meta.url)));
const demo = join(repository, 'demo');
const temporaryDirectories = [];

after(() => Promise.all(temporaryDirectories.map((path) => rm(path, { force: true, recursive: true }))));

async function temporaryProject() {
  const path = await mkdtemp(join(tmpdir(), 'jest-gpu-demo-'));
  temporaryDirectories.push(path);
  await symlink(join(demo, 'node_modules'), join(path, 'node_modules'), 'dir');
  return path;
}

function run(path, executable, arguments_, env = process.env) {
  const result = spawnSync(executable, arguments_, { cwd: path, encoding: 'utf8', env, timeout: 120_000 });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result;
}

test('the copied demo uses only its local configuration', async () => {
  const temporaryDirectory = await temporaryProject();
  for (const path of ['jest.config.mjs', 'tsconfig.json', 'globals.d.ts']) {
    await cp(join(demo, path), join(temporaryDirectory, path));
  }
  await cp(join(demo, 'test/webgl/00-context.test.ts'), join(temporaryDirectory, 'test/webgl/00-context.test.ts'));
  await cp(join(demo, 'test/webgpu/00-device.test.ts'), join(temporaryDirectory, 'test/webgpu/00-device.test.ts'));
  const config = await readFile(join(temporaryDirectory, 'jest.config.mjs'), 'utf8');
  const tsconfig = await readFile(join(temporaryDirectory, 'tsconfig.json'), 'utf8');
  assert.doesNotMatch(config, /\.\.\//);
  assert.doesNotMatch(tsconfig, /"extends"/);

  const result = run(
    temporaryDirectory,
    process.execPath,
    [
      join(repository, 'node_modules/jest/bin/jest.js'),
      '--config',
      join(temporaryDirectory, 'jest.config.mjs'),
      '--runInBand',
    ],
    { ...process.env, NODE_OPTIONS: '--experimental-vm-modules' },
  );

  assert.match(result.stderr, /2 passed/);
});

test('the README TypeScript quickstarts type-check and run', async () => {
  const readme = await readFile(join(repository, 'README.md'), 'utf8');
  const webgpu = readme.slice(readme.indexOf('## Render with WebGPU'), readme.indexOf('## Render with WebGL'));
  const webgl = readme.slice(readme.indexOf('## Render with WebGL'), readme.indexOf('## ESM note'));
  const tsconfig = JSON.parse(webgpu.match(/```json\n([\s\S]*?)```/)?.[1] ?? '');

  for (const [name, section] of [
    ['webgpu', webgpu],
    ['webgl', webgl],
  ]) {
    const path = await temporaryProject();
    await mkdir(join(path, 'test'));
    const config = section.match(/```js\n\/\/ jest\.config\.mjs\n([\s\S]*?)```/)?.[1];
    const globals = section.match(/```ts\n(import 'jest-environment-[^']+\/globals';)\n```/)?.[1];
    const testSource = section.match(/```ts\n\/\/ cube\.test\.ts\n([\s\S]*?)```/)?.[1];
    assert.ok(config && globals && testSource, `could not extract the ${name} quickstart`);

    const fixtureTsconfig = structuredClone(tsconfig);
    if (name === 'webgl') fixtureTsconfig.compilerOptions.types = ['node'];
    await Promise.all([
      writeFile(join(path, 'package.json'), '{"type":"module"}\n'),
      writeFile(join(path, 'jest.config.mjs'), config),
      writeFile(join(path, 'globals.d.ts'), `${globals}\n`),
      writeFile(join(path, 'tsconfig.json'), `${JSON.stringify(fixtureTsconfig, null, 2)}\n`),
      writeFile(join(path, 'test/cube.test.ts'), testSource),
    ]);

    run(path, process.execPath, [join(demo, 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.json']);
    run(path, process.execPath, [join(repository, 'node_modules/jest/bin/jest.js'), '--runInBand'], {
      ...process.env,
      NODE_OPTIONS: '--experimental-vm-modules',
    });
  }
});
