/* ============================================================
   src/world/postprocessing.js
   Bloom + Vignette using three's EffectComposer
   ============================================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js';
import { renderer, camera, scene } from './scene.js';

export let composer;

const VignetteShader = {
  uniforms: {
    tDiffuse:  { value: null },
    offset:    { value: 0.92 },
    darkness:  { value: 1.3 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
      gl_FragColor = vec4(mix(color.rgb, vec3(0.0), dot(uv,uv) * darkness), color.a);
    }
  `,
};

export function initPostProcessing(quality = 'high') {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  if (quality !== 'low') {
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      quality === 'high' ? 0.35 : 0.2,  // strength
      0.6,   // radius
      0.75   // threshold
    );
    composer.addPass(bloom);
  }

  const vignette = new ShaderPass(VignetteShader);
  composer.addPass(vignette);

  window.addEventListener('resize', () => {
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  return composer;
}

// Detect performance tier
export function detectQuality() {
  const cores = navigator.hardwareConcurrency || 2;
  const mobile = /Mobi|Android/i.test(navigator.userAgent);
  if (mobile || cores <= 2) return 'low';
  if (cores <= 4) return 'medium';
  return 'high';
}
