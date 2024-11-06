import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gBufferShaderVariants, getVariantKey } from './shaders/gbuffer';
import { ISheet } from '@theatre/core';
import { connectObjectToTheatre } from './theatreThree';

export const createScene = (loadingManager: THREE.LoadingManager, sheet: ISheet) => {
  const scene = new THREE.Scene()

  const gltfLoader = new GLTFLoader(loadingManager);

  gltfLoader.load("cliff/cliffscene.gltf", (gltf) => {
    const root = gltf.scene;
    root.traverse((obj) => configureSceneObjects(obj, sheet))
    scene.add(root);
  });

  return scene;
}

const configureSceneObjects = (object: THREE.Object3D, sheet: ISheet) => {
  if ("t_id" in object.userData) {
    connectObjectToTheatre(object, sheet);
  }

  if (object instanceof THREE.Mesh) {
    
    if (object.material instanceof THREE.MeshPhysicalMaterial) {
      // console.log(object.material)
    }

    const variantKey = getVariantKey(!!object.material.map, !!object.material.normalMap, !!object.material.roughnessMap, !!object.material.emissiveMap);
    // console.log(variantKey)
    const shader = gBufferShaderVariants[variantKey];
    // console.log(shader)

    // console.log(object.material);

    Object.keys(shader.uniforms).forEach((key) => {
      object.userData[key] = (object.material as Record<string, any>)[key]
    })

    object.material = shader;

    object.onBeforeRender = () => {
      Object.keys(shader.uniforms).forEach((key) => {
        shader.uniforms[key].value = object.userData[key]
      })
      shader.uniformsNeedUpdate = true;
    }
  }

  if (object instanceof THREE.Light) {
    if (object instanceof THREE.PointLight) {
      object.distance = object.intensity;
      console.log(object.name, object)
    }
  }
}