import * as THREE from "three";
import { RenderPass } from "./RenderPass";
import { fsQuad } from "./utils";
import { skyShader } from "../shaders/sky";

export class SkyPass extends RenderPass {
  camera: THREE.Camera;
  exposure: number;
  gamma: number;

  constructor(
    envMap: THREE.CubeTexture,
    camera: THREE.PerspectiveCamera
  ) {
    super("SkyPass");
    this.needsSwap = false;
    skyShader.uniforms.envMap.value = envMap;
    this.camera = camera;
    this.exposure = 0.1;
    this.gamma = 2.2;
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {    
    renderer.setRenderTarget(readBuffer);
    
    skyShader.uniforms.inverseProjection.value.copy(this.camera.projectionMatrixInverse);
    skyShader.uniforms.inverseViewMatrix.value.copy(this.camera.matrixWorld);
    skyShader.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    skyShader.uniforms.exposure.value = this.exposure;
    skyShader.uniforms.gamma.value = this.gamma;
  
    fsQuad.material = skyShader;
    fsQuad.render(renderer);
  }
}
