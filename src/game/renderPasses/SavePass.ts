import * as THREE from "three";
import { RenderPass } from "./RenderPass";
import { fsQuad } from "./utils";
import { copyShader } from "../shaders/copy";

export class SavePass extends RenderPass {
  buffer: THREE.WebGLRenderTarget;
  source?: THREE.Texture;

  constructor(width: number, height: number, source?: THREE.Texture) {
    super("SavePass");
    this.needsSwap = false;
    this.buffer = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    this.source = source;
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    renderer.setRenderTarget(this.buffer);
    renderer.clear(true, true, false);
    copyShader.uniforms.src.value = this.source ?? readBuffer.texture;
    copyShader.uniforms.u_resolution.value.set(this.buffer.width, this.buffer.height);
    fsQuad.material = copyShader;
    fsQuad.render(renderer);
  }
}