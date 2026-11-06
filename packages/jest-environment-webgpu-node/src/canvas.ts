/** RGBA8 pixels, top row first. Feed it to a screenshot matcher such as jest-image-snapshot after encoding to PNG. */
export type RgbaImage = {
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
  /** Pixel bytes, four per pixel in R, G, B, A order, rows top to bottom with no padding. */
  data: Uint8Array;
};

const COPY_SRC = 0x01;
const RENDER_ATTACHMENT = 0x10;
const MAP_READ = 0x01;
const COPY_DST = 0x08;
const READABLE_FORMATS = new Set<GPUTextureFormat>(['rgba8unorm', 'rgba8unorm-srgb', 'bgra8unorm', 'bgra8unorm-srgb']);

/** Minimal `GPUCanvasContext`: `getCurrentTexture()` is a texture the size of the canvas, kept until reconfigured or resized. */
export class HeadlessCanvasContext {
  #config: GPUCanvasConfiguration | undefined;
  #texture: GPUTexture | undefined;

  /**
   * Creates a context for a canvas; `HeadlessCanvas` does this for you.
   * @param canvas - The canvas this context renders into; its current size sets the texture size.
   */
  constructor(
    /** The canvas that owns this context. */
    readonly canvas: HeadlessCanvas,
  ) {}

  /**
   * Stores the configuration and discards any current texture, as `GPUCanvasContext.configure()` does.
   * @param config - The device, format and usage to render with.
   */
  configure(config: GPUCanvasConfiguration): void {
    this.#config = config;
    this.#drop();
  }

  /** Clears the configuration and destroys the current texture. */
  unconfigure(): void {
    this.#config = undefined;
    this.#drop();
  }

  /** Returns the configuration passed to `configure()`, or `null` before it is called or after `unconfigure()`. */
  getConfiguration(): GPUCanvasConfiguration | null {
    return this.#config ?? null;
  }

  /**
   * Returns the texture to render into, creating it at the canvas's current size on first use or after a resize.
   * @throws If `configure()` has not been called.
   */
  getCurrentTexture(): GPUTexture {
    const config = this.#config;
    if (!config) throw new Error('getCurrentTexture() called before configure()');
    const { width, height } = this.canvas;
    if (this.#texture && (this.#texture.width !== width || this.#texture.height !== height)) this.#drop();
    this.#texture ??= config.device.createTexture({
      size: [width, height],
      format: config.format,
      usage: (config.usage ?? RENDER_ATTACHMENT) | RENDER_ATTACHMENT | COPY_SRC,
      viewFormats: config.viewFormats,
    });
    return this.#texture;
  }

  /**
   * Copies the current texture to the CPU. BGRA formats are swizzled to RGBA.
   * @throws If the context is not configured or the format is not 8-bit RGBA or BGRA.
   */
  async readPixels(): Promise<RgbaImage> {
    const config = this.#config;
    if (!config) throw new Error('readPixels() called before configure()');
    const { device, format } = config;
    if (!READABLE_FORMATS.has(format)) {
      throw new Error(`readPixels() supports only 8-bit RGBA/BGRA formats; received ${format}`);
    }
    const texture = this.getCurrentTexture();
    const { width, height } = texture;
    const bytesPerRow = Math.ceil((width * 4) / 256) * 256;
    const buffer = device.createBuffer({ size: bytesPerRow * height, usage: MAP_READ | COPY_DST });
    try {
      const encoder = device.createCommandEncoder();
      encoder.copyTextureToBuffer({ texture }, { buffer, bytesPerRow }, [width, height]);
      device.queue.submit([encoder.finish()]);
      await buffer.mapAsync(MAP_READ);
      const padded = new Uint8Array(buffer.getMappedRange());
      const data = new Uint8Array(width * height * 4);
      for (let y = 0; y < height; y++)
        data.set(padded.subarray(y * bytesPerRow, y * bytesPerRow + width * 4), y * width * 4);
      if (format.startsWith('bgra')) {
        for (let i = 0; i < data.length; i += 4) [data[i], data[i + 2]] = [data[i + 2]!, data[i]!];
      }
      return { width, height, data };
    } finally {
      if (buffer.mapState === 'mapped') buffer.unmap();
      buffer.destroy();
    }
  }

  #drop(): void {
    this.#texture?.destroy();
    this.#texture = undefined;
  }
}

/** Enough of `HTMLCanvasElement` for three.js `WebGPURenderer`, Babylon Lite and friends. */
export class HeadlessCanvas {
  readonly #context = new HeadlessCanvasContext(this);
  /** Style properties libraries may set; stored but not applied to anything. */
  readonly style: Record<string, string> = {};
  readonly #attributes = new Map<string, string>();

  /**
   * Creates a canvas of the given size; see also `createCanvas()`.
   * @param width - Canvas width in pixels.
   * @param height - Canvas height in pixels.
   */
  constructor(
    /** Canvas width in pixels. Change it to resize the render target. */
    public width = 300,
    /** Canvas height in pixels. Change it to resize the render target. */
    public height = 150,
  ) {}

  /** Same as `width`. */
  get clientWidth(): number {
    return this.width;
  }

  /** Same as `height`. */
  get clientHeight(): number {
    return this.height;
  }

  /**
   * Returns this canvas's WebGPU context.
   * @param id - The context type, `'webgpu'`.
   */
  getContext(id: 'webgpu'): HeadlessCanvasContext;
  /**
   * Returns this canvas's WebGPU context for `'webgpu'`, or `null` for any other type.
   * @param id - The context type requested.
   */
  getContext(id: string): HeadlessCanvasContext | null;
  getContext(id: string): HeadlessCanvasContext | null {
    return id === 'webgpu' ? this.#context : null;
  }

  /** Reads back the canvas's current texture as RGBA8 pixels; see `HeadlessCanvasContext.readPixels()`. */
  readPixels(): Promise<RgbaImage> {
    return this.#context.readPixels();
  }

  /** This same object, typed as an element for libraries whose signatures demand one. */
  asElement(): HTMLCanvasElement {
    return this as unknown as HTMLCanvasElement;
  }

  /** Returns a rectangle at the origin with the canvas's size. */
  getBoundingClientRect(): {
    /** Always 0. */
    x: number;
    /** Always 0. */
    y: number;
    /** The canvas width. */
    width: number;
    /** The canvas height. */
    height: number;
    /** Always 0. */
    top: number;
    /** Always 0. */
    left: number;
  } {
    return { x: 0, y: 0, top: 0, left: 0, width: this.width, height: this.height };
  }

  /**
   * Stores an attribute for `getAttribute()`.
   * @param name - Attribute name.
   * @param value - Attribute value.
   */
  setAttribute(name: string, value: string): void {
    this.#attributes.set(name, value);
  }

  /**
   * Returns an attribute stored with `setAttribute()`, or `null` when unset.
   * @param name - Attribute name.
   */
  getAttribute(name: string): string | null {
    return this.#attributes.get(name) ?? null;
  }

  /** Does nothing; the canvas dispatches no events. */
  addEventListener(): void {}
  /** Does nothing. */
  removeEventListener(): void {}
  /** Does nothing and returns `true`. */
  dispatchEvent(): boolean {
    return true;
  }
}

/**
 * Creates a headless canvas whose `getContext('webgpu')` returns a texture-backed `GPUCanvasContext`. Also installed
 * as a global in the test environment.
 * @param width - Canvas width in pixels.
 * @param height - Canvas height in pixels.
 */
export const createCanvas = (width: number, height: number): HeadlessCanvas => new HeadlessCanvas(width, height);
