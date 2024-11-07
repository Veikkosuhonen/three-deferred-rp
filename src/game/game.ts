import * as THREE from 'three'
import Stats from "three/examples/jsm/libs/stats.module.js";
import { createScene } from './scene';
import { EffectComposer, Pass } from 'three/addons/postprocessing/EffectComposer.js';
import { BloomPass, FinalLightPass, GBufferPass, LightVolumePass, SkyPass, SSAOPass } from './renderPasses/passes';
import { ACESFilmicToneMappingShader, ShaderPass, MapControls, RGBELoader } from 'three/examples/jsm/Addons.js';
import { cubeToIrradiance, equirectToCube } from './equirectToCube';
import studio from '@theatre/studio'
import { getProject, ISheet, types } from '@theatre/core'
import { RenderPass } from './renderPasses/RenderPass';
import { connectPassToTheatre } from './theatreThree';
import { Game } from './gameState';
import { createLines } from './lineRenderer';
import theatreProject from "./demo project.theatre-project-state.json";

export const loadingManager = new THREE.LoadingManager();

export const start = async (canvas: HTMLCanvasElement) => {
  studio.initialize();
  const project = getProject("demo project", { state: theatreProject });
  const sheet = project.sheet("demo sheet");
  const game = new Game(await import("@dimforge/rapier3d"), sheet, loadingManager);

  const stats = setupStats();

  const renderer = setupRenderer(canvas);
  const scene = createScene(game);
  const debugLines = createLines();
  const camera = setupCamera();
  const clock = new THREE.Clock();
  const controls = setupControls(camera, renderer);
  const depthStencilTexture = setupDepthStencilTexture();
  const gBuffer = setupGBuffer(depthStencilTexture);
  const equirect = await loadEquirect();
  const cubeMap = equirectToCube(renderer, equirect, 1024);
  const irradianceMap = cubeToIrradiance(renderer, cubeMap.texture, 256);

  const composer = setupComposer(renderer, depthStencilTexture);
  composer.addPass(new GBufferPass(scene, camera, gBuffer));
  const ssaoPass = new SSAOPass(gBuffer, camera);
  composer.addPass(ssaoPass);
  const lightingPass = new LightVolumePass(scene, camera, gBuffer);
  composer.addPass(lightingPass);
  composer.addPass(new FinalLightPass(scene, camera, gBuffer, ssaoPass.ssaoBuffer.texture, irradianceMap.texture));
  composer.addPass(new SkyPass(cubeMap.texture, camera));
  composer.addPass(new BloomPass(0.1, 0.005));
  composer.addPass(new ShaderPass(ACESFilmicToneMappingShader));

  composer.passes.forEach((pass) => connectPassToTheatre(pass as RenderPass, sheet));

  const animate = () => {
    stats.begin();
    controls.update(clock.getDelta());
    game.world.step();
    composer.render();
    debugLines.updateFromBuffer(game.world.debugRender())
    renderer.render(debugLines.lines, camera);
    stats.end();
    requestAnimationFrame(animate);
  }

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);

  window.addEventListener('keydown', (event) => {
    // WHen press c, console.log camera position
    if (event.key === 'c') {
      console.log(camera.position);
    }
  })

  animate();
}

const setupDepthStencilTexture = () => {
  const depthStencilTexture = new THREE.DepthTexture(
    window.innerWidth, window.innerHeight,
    THREE.UnsignedInt248Type,
    THREE.UVMapping,
    THREE.ClampToEdgeWrapping,
    THREE.ClampToEdgeWrapping,
    THREE.NearestFilter,
    THREE.NearestFilter,
    1,
    THREE.DepthStencilFormat
  );

  return depthStencilTexture;
}

const setupGBuffer = (depthTexture: THREE.DepthTexture) => {
  const gBuffer = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    count: 4,
    depthBuffer: true,
    stencilBuffer: true,
    depthTexture,
  });

  return gBuffer;
}

const setupRenderer = (canvas: HTMLCanvasElement) => {
  const renderer = new THREE.WebGLRenderer({ 
    canvas,
    powerPreference: 'high-performance',
    antialias: false,
    depth: true,
    stencil: true,
    logarithmicDepthBuffer: true,
    precision: 'highp',
  });
  renderer.autoClear = false;
  renderer.autoClearStencil = false;
  renderer.setSize(window.innerWidth, window.innerHeight);
  return renderer;
}

const setupComposer = (renderer: THREE.WebGLRenderer, depthStencilTexture: THREE.DepthTexture) => {
  const rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    stencilBuffer: true,
    depthBuffer: true,
    depthTexture: depthStencilTexture,
    type: THREE.FloatType,
  })
  const composer = new EffectComposer(renderer, rt);
  return composer;
}

const setupCamera = () => {
  const fowY = 70;
  const aspect = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 1000;
  const camera = new THREE.PerspectiveCamera(fowY, aspect, near, far);

  camera.userData.halfSizeNearPlane = new THREE.Vector2(
    Math.tan(fowY) / 2.0 * aspect,
    Math.tan(fowY) / 2.0
  );

  camera.position.x = -18.052873910199146;
  camera.position.y = 0.8102733201729349;
  camera.position.z = 11.14622732715495;
  return camera;
}

const setupControls = (camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => {
  const controls = new MapControls(camera, renderer.domElement);
  return controls;
}

const loadEquirect = async () => {
  const texture = await new Promise<THREE.Texture>((resolve) => new RGBELoader(loadingManager).load('belfast_sunset_puresky_2k.hdr', (texture) => {
    resolve(texture)
  }));
  
  return texture;
}

const setupStats = () => {
  const stats = new Stats();
  stats.dom.style.position = 'absolute';
  stats.dom.style.top = "90vh";
  document.body.appendChild(stats.dom);
  return stats;
}
