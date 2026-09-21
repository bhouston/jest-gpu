// Plain CommonJS, run WITHOUT --experimental-vm-modules. The webgl environment needs no require()
// of its own (it only installs globals), so this is the CJS control test alongside webgpu.test.cjs.
test('clears a WebGL2 canvas to a colour and reads it back', () => {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const gl = canvas.getContext('webgl2');
  gl.clearColor(0, 1, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const pixels = new Uint8Array(4);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  expect(Array.from(pixels)).toEqual([0, 255, 0, 255]);
});
