import * as THREE from "three";
import { PassProps, RenderPass } from "./RenderPass";
import { lightningShader } from "../shaders";

export class LightPass extends RenderPass {
  lightScene: THREE.Scene;
  camera: THREE.Camera;
  gBuffer: THREE.WebGLRenderTarget;
  lightBuffer: THREE.WebGLRenderTarget;

  constructor(lightScene: THREE.Scene, camera: THREE.Camera, gBuffer: THREE.WebGLRenderTarget, lightBuffer: THREE.WebGLRenderTarget) {
    super("LightVolumePass");
    this.needsSwap = false;
    this.lightScene = lightScene;
    this.camera = camera;
    this.gBuffer = gBuffer;
    this.lightBuffer = lightBuffer;
    this.lightScene.overrideMaterial = lightningShader;

    lightningShader.uniforms.gColorAo.value = this.gBuffer.textures[0];
    lightningShader.uniforms.gNormalRoughness.value = this.gBuffer.textures[1];
    lightningShader.uniforms.gPositionMetalness.value = this.gBuffer.textures[2];
  }

  pass({ renderer }: PassProps) {
    renderer.setRenderTarget(this.lightBuffer);
    renderer.clear(true, true, false);

    lightningShader.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
  
    renderer.render(this.lightScene, this.camera);
  }
}