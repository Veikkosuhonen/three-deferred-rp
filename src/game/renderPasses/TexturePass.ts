import * as THREE from "three";
import { RenderPass } from "./RenderPass";
import { fsQuad } from "./utils";
import { copyShader } from "../shaders/copy";

export class TexturePass extends RenderPass {
  texture: THREE.Texture;
  mode: "additive"|"replace" = "replace";
  intensity: number = 1.0;

  constructor(
    passName: string, 
    texture: THREE.Texture, 
    mode: "additive"|"replace" = "replace", 
    intensity: number = 1.0,
  ) {
    super(passName);
    this.needsSwap = false;
    this.texture = texture;
    this.mode = mode;
    this.intensity = intensity;
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    renderer.setRenderTarget(readBuffer);

    if (this.mode === "additive") {
      copyShader.blending = THREE.AdditiveBlending;
      copyShader.transparent = true;
    } else {
      copyShader.blending = THREE.NormalBlending;
      copyShader.transparent = false;
    }

    copyShader.uniforms.src.value = this.texture;
    copyShader.uniforms.intensity.value = this.intensity;
    copyShader.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    fsQuad.material = copyShader;
    fsQuad.render(renderer);
  }
}
