import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/Addons.js";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from "three/examples/jsm/Addons.js";
import { RenderPass } from "three/examples/jsm/Addons.js";
import { UnrealBloomPass } from "three/examples/jsm/Addons.js";
import vertexJitter from "./vertex_jitter.js";

const w = window.innerWidth * .95;
const h = window.innerHeight * .95;

let jitterLevel = 10;

let camera, mixer;
let animationDuration = 0; // Will be updated
let actions = []; // Stores multiple animation actions
let targetScroll = 0; // Where we want to scroll
let currentScroll = 0; // Current interpolated position

// Initial setup
const scene = new THREE.Scene();
//scene.fog = new THREE.FogExp2(0x666666, .01);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

//post-processing
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), .2, 0.0, .005);
const composer = new EffectComposer(renderer);

// Load HDRI
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const hdriLoader = new RGBELoader()
hdriLoader.load('Textures/hdri.hdr', function (texture) {

  texture.magFilter = THREE.NearestFilter; // No smoothing when upscaling
  texture.minFilter = THREE.NearestFilter; // No smoothing when downscaling
  texture.generateMipmaps = false; // Disable mipmaps to avoid blurring

  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  texture.dispose();
  scene.environment = envMap;
  //scene.background = envMap;
});


// Load GLB
const loader = new GLTFLoader();
loader.load("Exports/store.glb", (gltf) => {
  scene.add(gltf.scene);

  mixer = new THREE.AnimationMixer(gltf.scene);

  gltf.scene.traverse((object) => {
    if (object.isCamera) {
      camera = object;
      camera.near = 0.1;
      camera.far = 1000;
      camera.updateProjectionMatrix();
    }

    // if (object.isMesh && object.material) {
    //   const materials = Array.isArray(object.material) ? object.material : [object.material];

    //   materials.forEach((material) => {
    //     material.onBeforeCompile = (shader) => {
    //       // Add the jitter uniform
    //       shader.uniforms.uJitterLevel = { value: jitterLevel };

    //       // Add the uniform declaration at the start of the vertex shader
    //       shader.vertexShader = shader.vertexShader.replace(
    //         'void main() {',
    //         'uniform float uJitterLevel;\nvoid main() {'
    //       );

    //       // Inject the jitter logic just before projection
    //       shader.vertexShader = shader.vertexShader.replace(
    //         `#include <project_vertex>`,
    //         `
    //           vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    //           gl_Position = projectionMatrix * mvPosition;
    //           gl_Position /= gl_Position.w;
    //           gl_Position.xy = floor(gl_Position.xy * uJitterLevel) / uJitterLevel * gl_Position.w;
    //         `
    //       );
    //     };
    //     material.needsUpdate = true;
    //   });
    // }
  });

  if (camera) {
    const renderScene = new RenderPass(scene, camera);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    //Pixelate?
  } else {
    console.error("Camera not found in GLTF file!");
  }

  // Iterate through all animations and play them
  gltf.animations.forEach((clip) => {
    let action = mixer.clipAction(clip);
    action.play();
    actions.push(action);

    // Find the longest animation to determine max scroll range
    animationDuration = Math.max(animationDuration, clip.duration);
  });

  animate();
});

// Handle mouse scroll
window.addEventListener('wheel', (event) => {
  targetScroll += event.deltaY * 0.002; // Adjust sensitivity
  targetScroll = Math.max(0, Math.min(animationDuration, targetScroll)); // Clamp within bounds
  console.log(camera.rotation);
});

function animate() {
  requestAnimationFrame(animate);

  if (mixer) {
    // Smoothly interpolate towards targetScroll
    currentScroll = THREE.MathUtils.lerp(currentScroll, targetScroll, 0.1); // Adjust 0.1 for speed
    mixer.setTime(currentScroll); // Set animation time based on scroll position
    
  }

  // jitterLevel = 200 + Math.sin(Date.now() * 0.005) * 50;

  // // Update the uniform value for all materials
  // scene.traverse((object) => {
  //   if (object.isMesh && object.material) {
  //     const materials = Array.isArray(object.material) ? object.material : [object.material];
  //     materials.forEach((material) => {
  //       if (material.uniforms && material.uniforms.uJitterLevel) {
  //         material.uniforms.uJitterLevel.value = jitterLevel;
  //       }
  //     });
  //   }
  // });
  composer.render(scene, camera);
  
}

animate();
