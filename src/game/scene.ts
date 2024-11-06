import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gBufferShaderVariants, getVariantKey } from './shaders/gbuffer';

export const createScene = (loadingManager: THREE.LoadingManager) => {
  const scene = new THREE.Scene()

  const gltfLoader = new GLTFLoader(loadingManager);

  gltfLoader.load("cliff/cliffscene.gltf", (gltf) => {
    const root = gltf.scene;
    root.traverse(configureSceneObjects)
    scene.add(root);
  });

  return scene;
}

const configureSceneObjects = (object: THREE.Object3D) => {
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
    // console.log(object.name, object)
  }
}