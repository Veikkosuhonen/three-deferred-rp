import * as THREE from "three";
import { RenderPass } from "./RenderPass";
import { fsQuad } from "./utils";
import { motionBlurShader } from "../shaders/motionBlur";

export class MotionBlurPass extends RenderPass {
  camera: THREE.PerspectiveCamera;
  amount: number = 1.0;

  constructor(camera: THREE.PerspectiveCamera, gBuffer: THREE.WebGLRenderTarget) {
    super("MotionBlurPass");
    this.camera = camera;
    motionBlurShader.uniforms.gPositionMetalness.value = gBuffer.textures[2];
    motionBlurShader.uniforms.gVelocity.value = gBuffer.textures[4];
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    renderer.setRenderTarget(writeBuffer);
    motionBlurShader.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    motionBlurShader.uniforms.amount.value = this.amount;
    motionBlurShader.uniforms.src.value = readBuffer.texture
    fsQuad.material = motionBlurShader;
    fsQuad.render(renderer);
  }
}