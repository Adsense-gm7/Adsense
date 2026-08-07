/* ============================================================
   src/world/postprocessing.js — Quality-adaptive post-processing
   ============================================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js';
import { renderer, camera, scene } from './scene.js';

export let composer;
export let useComposer = true;

const VignetteShader = {
  uniforms: { tDiffuse:{value:null}, offset:{value:0.92}, darkness:{value:1.3} },
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader: `uniform sampler2D tDiffuse;uniform float offset;uniform float darkness;varying vec2 vUv;
    void main(){vec4 c=texture2D(tDiffuse,vUv);vec2 uv=(vUv-vec2(0.5))*vec2(offset);
    gl_FragColor=vec4(mix(c.rgb,vec3(0.0),dot(uv,uv)*darkness),c.a);}`,
};

export function initPostProcessing(quality) {
  if (quality === 'low') { useComposer = false; return; }

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  if (quality === 'high') {
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.6, 0.75
    );
    composer.addPass(bloom);
  }

  const vignette = new ShaderPass(VignetteShader);
  composer.addPass(vignette);

  window.addEventListener('resize', () => composer.setSize(window.innerWidth, window.innerHeight));
}

export function detectQuality() {
  const mobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
  const cores  = navigator.hardwareConcurrency || 2;
  if (mobile || cores <= 2) return 'low';
  if (cores <= 4) return 'medium';
  return 'high';
}
