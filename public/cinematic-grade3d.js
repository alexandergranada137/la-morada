import * as THREE from './vendor/three/three.module.js';

const LUT_SIZE = 32;
const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));

function createColorLut() {
  const pixels = new Uint8Array(LUT_SIZE ** 3 * 4);
  let offset = 0;

  for (let z = 0; z < LUT_SIZE; z++) {
    for (let y = 0; y < LUT_SIZE; y++) {
      for (let x = 0; x < LUT_SIZE; x++) {
        const r = x / (LUT_SIZE - 1);
        const g = y / (LUT_SIZE - 1);
        const b = z / (LUT_SIZE - 1);
        const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        const greens = clamp((g - Math.max(r, b)) * 2.5);
        const saturation = 1 - chroma * 0.18 - greens * 0.25;

        // Keep near-black and white readable while giving the terrain more depth.
        const mids = 4 * luma * (1 - luma);
        const contrast = (luma - 0.5) * mids * 0.15;
        const shadowLift = 0.045 * (1 - luma) ** 2 * mids;
        const warmShadows = (1 - luma) ** 2 * mids;
        const warmLight = luma * mids;

        pixels[offset++] = Math.round(255 * clamp(luma + (r - luma) * saturation + contrast + shadowLift + 0.040 * warmShadows + 0.078 * warmLight));
        pixels[offset++] = Math.round(255 * clamp(luma + (g - luma) * saturation + contrast + shadowLift + 0.009 * warmShadows + 0.028 * warmLight));
        pixels[offset++] = Math.round(255 * clamp(luma + (b - luma) * saturation + contrast + shadowLift - 0.044 * warmShadows - 0.076 * warmLight));
        pixels[offset++] = 255;
      }
    }
  }

  const lut = new THREE.Data3DTexture(pixels, LUT_SIZE, LUT_SIZE, LUT_SIZE);
  lut.format = THREE.RGBAFormat;
  lut.minFilter = lut.magFilter = THREE.LinearFilter;
  lut.needsUpdate = true;
  return lut;
}

export function createCinematicGrade(renderer) {
  const lut = createColorLut();
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    toneMapped: false,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    uniforms: {
      frame: { value: null },
      colorLut: { value: lut },
      lutSize: { value: LUT_SIZE },
      strength: { value: 0 },
    },
    vertexShader: `
      out vec2 screenUv;
      void main() {
        screenUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D frame;
      uniform highp sampler3D colorLut;
      uniform float lutSize;
      uniform float strength;
      in vec2 screenUv;
      out vec4 outColor;

      void main() {
        vec3 original = texture(frame, screenUv).rgb;
        vec3 address = (original * (lutSize - 1.0) + 0.5) / lutSize;
        vec3 graded = texture(colorLut, address).rgb;
        outColor = vec4(mix(original, graded, strength), 1.0);
      }
    `,
  });

  const pass = new THREE.Scene();
  const camera = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  pass.add(quad);

  const size = new THREE.Vector2();
  let frame;

  return {
    apply(strength) {
      renderer.getDrawingBufferSize(size);
      if (!size.x || !size.y || Math.max(size.x, size.y) > renderer.capabilities.maxTextureSize) return;
      if (!frame || frame.image.width !== size.x || frame.image.height !== size.y) {
        frame?.dispose();
        frame = new THREE.FramebufferTexture(size.x, size.y);
        material.uniforms.frame.value = frame;
      }

      // The source already has the renderer's filmic tone mapping and sRGB encoding.
      renderer.copyFramebufferToTexture(frame);
      material.uniforms.strength.value = strength;
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      try {
        renderer.render(pass, camera);
      } finally {
        renderer.autoClear = autoClear;
      }
    },
    dispose() {
      frame?.dispose();
      lut.dispose();
      material.dispose();
      quad.geometry.dispose();
    },
  };
}
