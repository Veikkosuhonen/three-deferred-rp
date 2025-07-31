import * as THREE from 'three';
import { lampMaterial } from './materials/lamp';
import { buildingMaterial } from './materials/building';
import { lightningShader } from './shaders';
import { lightningShaderInstanced } from './shaders/lighting';
import { timeline } from './timeline';

export const setupTextCamera = (mainCamera: THREE.PerspectiveCamera) => {
  const textCamera = mainCamera.clone();
  
  textCamera.position.copy(timeline.END_POS);
  textCamera.lookAt(timeline.END_TARGET);

  textCamera.updateMatrix();
  textCamera.updateProjectionMatrix();
  textCamera.updateWorldMatrix(true, true)
  console.log(textCamera)

  syncTextShaderUniforms(textCamera, lampMaterial);
  syncTextShaderUniforms(textCamera, buildingMaterial);
  syncTextShaderUniforms(textCamera, lightningShaderInstanced);

  return textCamera;
}

export const syncTextShaderUniforms = (camera: THREE.PerspectiveCamera, shader: THREE.ShaderMaterial) => {
  shader.uniforms.textProjectionMatrix.value = camera.projectionMatrix;
  shader.uniforms.textViewMatrix.value = camera.matrixWorldInverse;
  shader.uniformsNeedUpdate = true;
  console.log("PROJECTION", shader.uniforms.textProjectionMatrix.value)
  console.log("WORLD", shader.uniforms.textViewMatrix.value)
}
