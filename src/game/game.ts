import * as THREE from 'three'
import Stats from "three/examples/jsm/libs/stats.module.js";
import { createScene } from './scene';
import { EffectComposer, Pass } from 'three/addons/postprocessing/EffectComposer.js';
import { BloomPass, DebugPass, IBLPass, GBufferPass, LightVolumePass, MotionBlurPass, SavePass, SkyPass, SSAOPass, SSRPass, TexturePass } from './renderPasses/passes';
import { ACESFilmicToneMappingShader, ShaderPass, MapControls, RGBELoader, FlyControls } from 'three/examples/jsm/Addons.js';
import { cubeToIrradiance, equirectToCube, equirectToPrefilter, generateBrdfLUT } from './envMaps';
import studio from '@theatre/studio'
import { getProject, ISheet, types } from '@theatre/core'
import { RenderPass } from './renderPasses/RenderPass';
import { connectPassToTheatre } from './theatreThree';
import { Game } from './gameState';
import { createLines } from './lineRenderer';
import theatreProject from "./demo project.theatre-project-state.json";

export const loadingManager = new THREE.LoadingManager();
export let onLoaded: () => void;

export const start = async (canvas: HTMLCanvasElement) => {
  studio.initialize();
  const project = getProject("demo project", { state: theatreProject });
  const sheet = project.sheet("demo sheet");
  onLoaded = () => sheet.sequence.play({ iterationCount: Infinity, rate: 1.5 });

  const game = new Game(sheet, loadingManager);

  const stats = setupStats();

  const renderer = setupRenderer(canvas);
  const scene = createScene(game);
  const debugLines = createLines();
  const camera = setupCamera();
  const clock = new THREE.Clock();
  const controls = setupControls(camera, renderer);
  const depthStencilTexture = setupDepthStencilTexture();
  const gBuffer = setupGBuffer(depthStencilTexture);
  const lightBuffer = setupLightBuffer(depthStencilTexture);
  const equirect = await loadEquirect();
  const cubeMap = equirectToCube(renderer, equirect, 1024);
  const irradianceMap = cubeToIrradiance(renderer, cubeMap.texture, 256);
  const prefilteredMap = equirectToPrefilter(renderer, equirect);
  const brdfLUT = generateBrdfLUT(renderer);

  const composer = setupComposer(renderer, depthStencilTexture);

  composer.addPass(new GBufferPass(scene, camera, gBuffer));

  const ssaoPass = new SSAOPass(gBuffer, camera);
  composer.addPass(ssaoPass);

  const lightingPass = new LightVolumePass(scene, camera, gBuffer, lightBuffer);
  composer.addPass(lightingPass);

  composer.addPass(new IBLPass(
    scene, camera, gBuffer, lightBuffer,
    ssaoPass.ssaoBuffer.texture, 
    irradianceMap.texture, prefilteredMap.texture, brdfLUT,
  ));

  composer.addPass(new TexturePass("IBL Diffuse output", lightBuffer.textures[0]));

  composer.addPass(new SkyPass(cubeMap.texture, camera));

  // composer.addPass(new MotionBlurPass(camera, gBuffer));

  composer.addPass(new SSRPass(gBuffer, camera, lightBuffer, brdfLUT));

  const bloomPass = new BloomPass(0.1, 0.005);
  composer.addPass(bloomPass);
  // composer.addPass(new DebugPass(gBuffer.textures[1]));
  composer.addPass(new ShaderPass(ACESFilmicToneMappingShader));

  composer.passes.forEach((pass) => connectPassToTheatre(pass as RenderPass, sheet));

  const animate = () => {
    stats.begin();
    controls.update(clock.getDelta() * 10.0);
    game.world.step();
    composer.render();
    debugLines.updateFromBuffer(game.world.debugRender())
    renderer.render(debugLines.lines, camera);
    camera.userData.previousViewMatrix.copy(camera.matrixWorldInverse);
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

/**
 * gBuffer is a render target that stores the following information:
 * 0: Color + Ambient Occlusion
 * 1: Normal + Roughness
 * 2: Position + Metalness
 * 3: Emission
 * 4: Velocity
 */
const setupGBuffer = (depthTexture: THREE.DepthTexture) => {
  const gBuffer = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    count: 5,
    depthBuffer: true,
    stencilBuffer: true,
    depthTexture,
  });

  return gBuffer;
}

const setupLightBuffer = (depthTexture: THREE.DepthTexture) => {
  const lightBuffer = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    count: 2,
    depthBuffer: true,
    stencilBuffer: true,
    depthTexture,
  });

  return lightBuffer;
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
  const fowY = 60;
  const aspect = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 1000;
  const camera = new THREE.PerspectiveCamera(fowY, aspect, near, far);

  camera.userData.halfSizeNearPlane = new THREE.Vector2(
    Math.tan(fowY) / 2.0 * aspect,
    Math.tan(fowY) / 2.0
  );

  camera.position.set(-26.09326933989273, 4.565589790360267, 3.423807085910849);

  camera.userData.previousViewMatrix = new THREE.Matrix4();

  return camera;
}

const setupControls = (camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => {
  const controls = new MapControls(camera, renderer.domElement);
  // controls.movementSpeed = 2;
  // controls.rollSpeed = 0.05;
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
