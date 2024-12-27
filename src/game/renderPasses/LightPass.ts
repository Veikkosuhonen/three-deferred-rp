import * as THREE from "three";
import { RenderPass } from "./RenderPass";
import { lightningShader } from "../shaders";

export class LightPass extends RenderPass {
  scene: THREE.Scene;
  camera: THREE.Camera;
  gBuffer: THREE.WebGLRenderTarget;
  lightBuffer: THREE.WebGLRenderTarget;
  lightVolume: THREE.Mesh;

  constructor(scene: THREE.Scene, camera: THREE.Camera, gBuffer: THREE.WebGLRenderTarget, lightBuffer: THREE.WebGLRenderTarget) {
    super("LightVolumePass");
    this.needsSwap = false;
    this.scene = scene;
    this.camera = camera;
    this.gBuffer = gBuffer;
    this.lightBuffer = lightBuffer;
  
    this.lightVolume = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
    );

    lightningShader.uniforms.gColorAo.value = this.gBuffer.textures[0];
    lightningShader.uniforms.gNormalRoughness.value = this.gBuffer.textures[1];
    lightningShader.uniforms.gPositionMetalness.value = this.gBuffer.textures[2];
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, _readBuffer: THREE.WebGLRenderTarget) {
    renderer.setRenderTarget(this.lightBuffer);
    renderer.clear(true, true, false);

    lightningShader.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    lightningShader.uniforms.u_camPos.value.copy(this.camera.position);
    lightningShader.uniforms.modelViewMatrix.value.copy(this.camera.modelViewMatrix);
    lightningShader.uniforms.projectionMatrix.value.copy(this.camera.projectionMatrix);
    
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.PointLight)) return;

      lightningShader.uniforms.lightColor.value.copy(obj.color);
      lightningShader.uniforms.lightColor.value.multiplyScalar(obj.intensity);
      const positionVS = obj.position.clone().applyMatrix4(this.camera.matrixWorldInverse);
      lightningShader.uniforms.lightPositionVS.value.copy(positionVS);

      this.lightVolume.position.copy(obj.position);
      this.lightVolume.scale.set(obj.distance, obj.distance, obj.distance);
      this.lightVolume.updateMatrix();
    
      lightningShader.uniformsNeedUpdate = true;
      this.lightVolume.material = lightningShader;

      renderer.render(this.lightVolume, this.camera);
    });
  }
}