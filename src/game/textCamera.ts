import * as THREE from 'three';
import { lampMaterial } from './materials/lamp';
import { buildingMaterial } from './materials/building';

export const setupTextCamera = (mainCamera: THREE.PerspectiveCamera) => {
  const textCamera = mainCamera.clone();
  textCamera.lookAt(new THREE.Vector3(0, 0, 0));
  textCamera.position.set(177, 346, 239);

  syncTextShaderUniforms(textCamera, lampMaterial);
  syncTextShaderUniforms(textCamera, buildingMaterial);

  return textCamera;
}

export const syncTextShaderUniforms = (camera: THREE.PerspectiveCamera, shader: THREE.ShaderMaterial) => {
  shader.uniforms.textProjectionMatrix.value.copy(camera.projectionMatrix);
  shader.uniforms.textViewMatrix.value.copy(camera.matrixWorldInverse);
}
