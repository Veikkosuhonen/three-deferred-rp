import * as THREE from "three";
import {
  ACESFilmicToneMappingShader,
  EffectComposer,
  RGBELoader,
  ShaderPass,
} from "three/examples/jsm/Addons.js";
import { BloomPass } from "./renderPasses/BloomPass";
import { BokehPass } from "./renderPasses/BokehPass";
import { GBufferPass } from "./renderPasses/GBufferPass";
import { IBLPass } from "./renderPasses/IBLPass";
import { LightPass } from "./renderPasses/LightPass";
import { SavePass } from "./renderPasses/SavePass";
import { SkyPass } from "./renderPasses/SkyPass";
import { SSAOPass } from "./renderPasses/SSAOPass";
import { SSRPass } from "./renderPasses/SSRPass";
import { TexturePass } from "./renderPasses/TexturePass";
import { RenderPass } from "./renderPasses/RenderPass";
import {
  cubeToIrradiance,
  equirectToCube,
  equirectToPrefilter,
  generateBrdfLUT,
} from "./envMaps";
import { connectPassToTheatre } from "./theatreThree";
import { Game } from "./gameState";
import { DebugPass } from "./renderPasses/DebugPass";
import { FogPass } from "./renderPasses/FogPass";
import { MotionBlurPass } from "./renderPasses/MotionBlurPass";

export const setupPipeline = async (game: Game) => {
  const depthStencilTexture = setupDepthStencilTexture();
  const gBuffer = setupGBuffer(depthStencilTexture);
  const lightBuffer = setupLightBuffer(depthStencilTexture);
  const equirect = await loadEquirect(game);
  const cubeMap = equirectToCube(game.renderer, equirect, 1024);
  const irradianceMap = cubeToIrradiance(game.renderer, cubeMap.texture, 256);
  const prefilteredMap = equirectToPrefilter(game.renderer, equirect);
  const brdfLUT = generateBrdfLUT(game.renderer);

  const composer = setupComposer(game.renderer, depthStencilTexture);

  const savePass = new SavePass(gBuffer.width, gBuffer.height);

  composer.addPass(new GBufferPass(game.scene, game.mainCamera, gBuffer));

  const ssaoPass = new SSAOPass(gBuffer, game.mainCamera);
  composer.addPass(ssaoPass);

  const lightingPass = new LightPass(
    game.lights,
    game.mainCamera,
    gBuffer,
    lightBuffer,
  );
  composer.addPass(lightingPass);

  composer.addPass(
    new IBLPass(
      game.scene,
      game.mainCamera,
      gBuffer,
      lightBuffer,
      ssaoPass.ssaoBuffer.texture,
      irradianceMap.texture,
      prefilteredMap.texture,
      brdfLUT,
    ),
  );

  composer.addPass(
    new TexturePass("IBL Diffuse output", lightBuffer.textures[0]),
  );

  composer.addPass(new SkyPass(gBuffer, cubeMap.texture, game.mainCamera));

  const ssrPass = new SSRPass(
    gBuffer,
    game.mainCamera,
    savePass.buffer.texture,
    lightBuffer.textures[1],
    brdfLUT,
  );
  composer.addPass(ssrPass);

  // composer.addPass(new FogPass(gBuffer, game.mainCamera));

  composer.addPass(savePass);

  composer.addPass(new BokehPass(gBuffer, game.mainCamera));

  const bloomPass = new BloomPass(0.1, 0.005);
  composer.addPass(bloomPass);
  // composer.addPass(new DebugPass(lightBuffer.textures[0]));
  composer.addPass(new ShaderPass(ACESFilmicToneMappingShader));

  composer.passes.forEach((pass) =>
    connectPassToTheatre(pass as RenderPass, game.sheet),
  );

  return composer;
};

const setupDepthStencilTexture = () => {
  const depthStencilTexture = new THREE.DepthTexture(
    window.innerWidth,
    window.innerHeight,
    THREE.UnsignedInt248Type,
    THREE.UVMapping,
    THREE.ClampToEdgeWrapping,
    THREE.ClampToEdgeWrapping,
    THREE.NearestFilter,
    THREE.NearestFilter,
    1,
    THREE.DepthStencilFormat,
  );

  return depthStencilTexture;
};

/**
 * gBuffer is a render target that stores the following information:
 * 0: Color + Ambient Occlusion
 * 1: Normal + Roughness
 * 2: Position + Metalness
 * 3: Emission
 * 4: Velocity
 */
const setupGBuffer = (depthTexture: THREE.DepthTexture) => {
  const gBuffer = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      count: 5,
      depthBuffer: true,
      stencilBuffer: true,
      depthTexture,
    },
  );

  return gBuffer;
};

const setupLightBuffer = (depthTexture: THREE.DepthTexture) => {
  const lightBuffer = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      count: 2,
      depthBuffer: true,
      stencilBuffer: true,
      depthTexture,
    },
  );

  return lightBuffer;
};

const setupComposer = (
  renderer: THREE.WebGLRenderer,
  depthStencilTexture: THREE.DepthTexture,
) => {
  const rt = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
      stencilBuffer: true,
      depthBuffer: true,
      depthTexture: depthStencilTexture,
      type: THREE.FloatType,
    },
  );
  const composer = new EffectComposer(renderer, rt);
  return composer;
};

const loadEquirect = async (game: Game) => {
  const texture = await new Promise<THREE.Texture>((resolve) =>
    new RGBELoader(game.loadingManager).load(
      "belfast_sunset_puresky_2k.hdr",
      (texture) => {
        resolve(texture);
      },
    ),
  );

  return texture;
};
