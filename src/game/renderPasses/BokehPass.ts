import * as THREE from "three";
import { RenderPass } from "./RenderPass";
import { bokehShader } from "../shaders/bokeh";
import { fsQuad } from "./utils";

export class BokehPass extends RenderPass {
  focus = 1.0;
  aperture = 0.025;
  maxBlur = 0.001;

  gBuffer: THREE.WebGLRenderTarget;

  constructor(gBuffer: THREE.WebGLRenderTarget, camera: THREE.PerspectiveCamera) {
    super("BokehPass")
    this.gBuffer = gBuffer;
    bokehShader.uniforms.gPositionMetalness.value = gBuffer.textures[2]
    bokehShader.uniforms.nearClip.value = camera.near;
    bokehShader.uniforms.farClip.value = camera.far;
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    renderer.setRenderTarget(writeBuffer);
    renderer.clear();

    fsQuad.material = bokehShader;

    bokehShader.uniforms.src.value = readBuffer.texture;
    bokehShader.uniforms.focus.value = this.focus;
    bokehShader.uniforms.aperture.value = this.aperture;
    bokehShader.uniforms.maxBlur.value = this.maxBlur;
    bokehShader.uniforms.u_resolution.value.set(readBuffer.width, readBuffer.height)

    fsQuad.render(renderer);
  }
}