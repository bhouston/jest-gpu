import Link from '@docusaurus/Link';
import CodeBlock from '@theme/CodeBlock';
import Layout from '@theme/Layout';

const workflow = [
  ['Install', 'Add Jest and one environment package'],
  ['Configure', 'Set testEnvironment in your Jest config'],
  ['Render', 'Use WebGPU or WebGL in a normal test'],
  ['Assert', 'Read pixels back and check them'],
];

const cards = [
  {
    name: 'Getting started',
    label: 'Install and first test',
    href: '/docs/getting-started/',
    body: 'Set up Jest with either environment and run a passing GPU test, in CommonJS or ESM.',
  },
  {
    name: 'WebGPU',
    label: 'jest-environment-webgpu-node',
    href: '/docs/webgpu/',
    body: 'Dawn options, a headless canvas, and pixel readback for three.js, Babylon Lite and vgpu.',
  },
  {
    name: 'WebGL',
    label: 'jest-environment-webgl-node',
    href: '/docs/webgl/',
    body: 'WebGL 1 and 2 with a fresh DOM per test file, fake timers and automatic canvas cleanup.',
  },
  {
    name: 'CI',
    label: 'No GPU needed',
    href: '/docs/ci/',
    body: 'Mesa llvmpipe and lavapipe packages and environment for GPU-less Linux runners.',
  },
];

const heroTest = `// gpu.test.js
const { createCanvas } = require('jest-environment-webgpu-node');

it('clears to red on a real GPU', async () => {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const canvas = createCanvas(4, 4);
  const context = canvas.getContext('webgpu');
  context.configure({ device, format: 'rgba8unorm' });

  const encoder = device.createCommandEncoder();
  encoder
    .beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: [1, 0, 0, 1],
        },
      ],
    })
    .end();
  device.queue.submit([encoder.finish()]);

  const { data } = await canvas.readPixels();
  expect([...data.slice(0, 4)]).toEqual([255, 0, 0, 255]);
});`;

const test = `it('renders', () => {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(64, 64, false);
  renderer.render(scene, camera);

  const gl = renderer.getContext();
  const pixels = new Uint8Array(4);
  gl.readPixels(32, 32, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  expect(pixels[3]).toBe(255);
});`;

const gpuTest = `import { createCanvas } from 'jest-environment-webgpu-node';

const canvas = createCanvas(256, 256);
const renderer = new THREE.WebGPURenderer({ canvas: canvas.asElement() });
await renderer.init();
await renderer.renderAsync(scene, camera);
const { width, height, data } = await canvas.readPixels();`;

export default function Home() {
  return (
    <Layout
      title="Real WebGPU and WebGL tests in Jest"
      description="Real WebGPU and WebGL tests in plain Jest, with no browser. Jest environments that put a GPU-backed context on the test global."
    >
      <header className="home-hero container">
        <div>
          <p className="eyebrow">Jest · WebGPU · WebGL</p>
          <h1>
            Test your renderer.
            <br />
            <em>Skip the browser.</em>
          </h1>
          <p className="hero-description">
            Two Jest environments put a real GPU context on the test global. three.js, Babylon.js and plain WebGPU or
            WebGL code run unchanged in Node, and native GPU testing runs up to 2.4x faster than a browser.
          </p>
          <div className="hero-actions">
            <Link className="button button--primary button--lg" to="/docs/getting-started/">
              Get started <span aria-hidden>→</span>
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/webgpu/">
              WebGPU
            </Link>
          </div>
        </div>
        <figure className="hero-preview">
          <CodeBlock language="javascript" title="A WebGPU test in Node">
            {heroTest}
          </CodeBlock>
        </figure>
      </header>
      <main>
        <section className="workflow-band" aria-label="How it works">
          <div className="container workflow-steps">
            {workflow.map(([title, detail], index) => (
              <div key={title}>
                <span className="workflow-number">0{index + 1}</span>
                <strong>{title}</strong>
                <p>{detail}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="container story-section" aria-labelledby="webgpu-title">
          <div>
            <p className="eyebrow">WebGPU through Dawn</p>
            <h2 id="webgpu-title">
              Headless canvas,
              <br />
              pixels you can read.
            </h2>
            <p>
              <code>navigator.gpu</code> and every <code>GPU*</code> global are installed, with a headless canvas that
              three.js, Babylon Lite and vgpu accept. Both packages ship ESM and CommonJS builds.
            </p>
            <Link to="/docs/webgpu/">Read about WebGPU →</Link>
          </div>
          <CodeBlock language="typescript" title="A three.js WebGPU render and readback">
            {gpuTest}
          </CodeBlock>
        </section>
        <section className="container story-section" aria-labelledby="webgl-title">
          <CodeBlock language="typescript" title="A WebGL test">
            {test}
          </CodeBlock>
          <div>
            <p className="eyebrow">WebGL 1 and 2</p>
            <h2 id="webgl-title">
              Existing WebGL code
              <br />
              works too.
            </h2>
            <p>
              <code>document.createElement('canvas').getContext('webgl2')</code> returns a GPU-backed context. Each test
              file gets a fresh document, Jest fake timers control animation frames, and canvases are released at
              teardown.
            </p>
            <Link to="/docs/webgl/">Read about WebGL →</Link>
          </div>
        </section>
        <section className="container package-section" aria-labelledby="docs-title">
          <div className="section-heading">
            <p className="eyebrow">Keep reading</p>
            <h2 id="docs-title">Find the part you need.</h2>
          </div>
          <div className="package-grid">
            {cards.map((card) => (
              <Link key={card.name} to={card.href} className="package-card">
                <p className="package-label">{card.label}</p>
                <h3>{card.name}</h3>
                <p>{card.body}</p>
                <span>Read more →</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="container home-callout">
          <div>
            <p className="eyebrow">Jest 29 and 30 · Node.js 22+ · MIT</p>
            <h2>From install to a passing GPU test.</h2>
            <CodeBlock language="bash">pnpm add -D jest jest-environment-webgpu-node</CodeBlock>
            <p>
              Using Vitest? Try <a href="https://vitest-gpu.ben3d.ca/">vitest-gpu</a>.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="button button--primary button--lg" to="/docs/getting-started/">
              Run your first test
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/api/">
              API reference
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
