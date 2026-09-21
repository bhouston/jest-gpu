import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

test('packed WebGPU globals retain their types for ESM and CommonJS consumers', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'jest-gpu-package-'));
  try {
    const packageDir = join(root, 'packages/jest-environment-webgpu-node');
    const packed = JSON.parse(
      run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', fixture], packageDir),
    );
    const modules = join(fixture, 'node_modules');
    const installed = join(modules, 'jest-environment-webgpu-node');
    await mkdir(installed, { recursive: true });
    run('tar', ['-xzf', join(fixture, packed[0].filename), '--strip-components=1', '-C', installed], root);
    // Only dependencies are linked; all package code and declarations come from the tarball.
    await symlink(join(packageDir, 'node_modules'), join(installed, 'node_modules'), 'dir');
    await symlink(join(root, 'node_modules/@types'), join(modules, '@types'), 'dir');
    await writeFile(join(fixture, 'globals.d.ts'), "import 'jest-environment-webgpu-node/globals';\n");
    const consumer = `import type { RgbaImage } from 'jest-environment-webgpu-node';
const canvas = createCanvas(4, 4);
const image: Promise<RgbaImage> = canvas.readPixels();
void image;
const width: number = canvas.width;
// @ts-expect-error Dimensions must remain numbers, even with skipLibCheck enabled.
createCanvas('4', '4');
// @ts-expect-error The result must not silently degrade to any.
const wrong: string = createCanvas(4, 4);
void width;
void wrong;
`;
    await writeFile(join(fixture, 'consumer.mts'), consumer);
    await writeFile(join(fixture, 'consumer.cts'), consumer);
    const config = {
      compilerOptions: {
        target: 'ES2024',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        types: ['node'],
        lib: ['ES2024', 'DOM'],
        strict: true,
        noEmit: true,
      },
      include: ['globals.d.ts', 'consumer.mts', 'consumer.cts'],
    };
    // Strict declaration checking catches missing packed files; skipLibCheck must still
    // preserve the public type rather than hiding the failure behind an implicit any.
    const tsPackage = JSON.parse(await readFile(join(root, 'node_modules/typescript/package.json'), 'utf8'));
    const compiler = join(root, 'node_modules/typescript', tsPackage.bin.tsc);
    for (const skipLibCheck of [false, true]) {
      config.compilerOptions.skipLibCheck = skipLibCheck;
      await writeFile(join(fixture, 'tsconfig.json'), JSON.stringify(config));
      run(process.execPath, [compiler, '-p', join(fixture, 'tsconfig.json')], root);
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
