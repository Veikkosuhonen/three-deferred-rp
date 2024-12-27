import * as THREE from "three";
import { RenderPass } from "./RenderPass";
import { fsQuad } from "./utils";
import { copyShader } from "../shaders/copy";

export class DebugPass extends RenderPass {
  texture: THREE.Texture;
  mode: number = 1.0;

  constructor(texture: THREE.Texture) {
    super("DebugPass");
    this.texture = texture;
    this.needsSwap = false;
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, deltaTime: number, maskActive: boolean): void {
    if (this.mode) {
      renderer.setRenderTarget(readBuffer);
      copyShader.uniforms.src.value = this.texture;
      copyShader.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
      fsQuad.material = copyShader;
      fsQuad.render(renderer);
    }
  }
}