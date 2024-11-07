import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gBufferShaderVariants, getVariantKey } from './shaders/gbuffer';
import { ISheet } from '@theatre/core';
import { connectObjectToTheatre } from './theatreThree';
import { Game } from './gameState';
import RAPIER from "@dimforge/rapier3d";

export const createScene = (game: Game) => {
  const scene = new THREE.Scene()

  const gltfLoader = new GLTFLoader(game.loadingManager);

  gltfLoader.load("cliff/cliffscene.gltf", (gltf) => {
    const root = gltf.scene;
    root.traverse((obj) => configureSceneObjects(obj, game))
    scene.add(root);
  });

  return scene;
}

const configureSceneObjects = (object: THREE.Object3D, game: Game) => {
  if ("t_id" in object.userData) {
    connectObjectToTheatre(object, game.sheet);
  }

  if ("mass" in object.userData) {
    const desc = RAPIER.RigidBodyDesc.dynamic();
    desc.setTranslation(object.position.x, object.position.y, object.position.z);
    desc.setRotation(object.quaternion);

    const body = game.world.createRigidBody(desc);

    object.userData.body = body;
    object.userData.isDynamic = true;
  } else {
    const desc = RAPIER.RigidBodyDesc.fixed();
    desc.setTranslation(object.position.x, object.position.y, object.position.z);
    desc.setRotation(object.quaternion);

    const body = game.world.createRigidBody(desc);
    object.userData.body = body;
  }

  if ("static_collider" in object.userData || "mesh_collider" in object.userData) {
    let geometry;
    if (object.userData.collider_name) {
      console.log(object)
      object.traverse((child) => {
        if (child.name === object.userData.collider_name && child instanceof THREE.Mesh) {
          geometry = child.geometry;
          child.visible = false;
        }
      })
    } else if (object instanceof THREE.Mesh) {
      geometry = object.geometry;
    }

    if (!geometry) {
      throw new Error(`Failed to find geometry for object ${object.name}`);
    }

    const vertexData = geometry.attributes.position.array;

    const points = new Float32Array(vertexData.length)
    for (let i = 0; i < vertexData.length; i += 3) {
      const position = new THREE.Vector3(vertexData[i], vertexData[i + 1], vertexData[i + 2]);
      const worldPosition = object.localToWorld(position);
      worldPosition.sub(object.position);
      points[i] =     worldPosition.x;
      points[i + 1] = worldPosition.y;
      points[i + 2] = worldPosition.z;
    }

    let colliderDesc;

    const indexData = geometry.index?.array;
    if (indexData) {
      const indices = new Uint32Array(indexData.length);
      for (let i = 0; i < indexData.length; i++) {
        indices[i] = indexData[i];
      }
      colliderDesc = RAPIER.ColliderDesc.trimesh(points, indices);
    } else {
      colliderDesc = RAPIER.ColliderDesc.convexHull(points);
    }

    if (!colliderDesc) {
      throw new Error(`Failed to create collider for object ${object.name}`);
    }

    object.userData.collider = game.world.createCollider(colliderDesc, object.userData.body);
  }

  if ("sphere_collider" in object.userData) {
    const scale = object.scale.x;
    const colliderDesc = RAPIER.ColliderDesc.ball(scale);
    
    object.userData.collider = game.world.createCollider(colliderDesc, object.userData.body);
  }

  if (object instanceof THREE.Mesh) {

    

    

    if (object.userData.collider) {
      console.log(object.name, object.userData)
    }

    
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
    
      if (object.userData.isDynamic) {
        const body = object.userData.body as RAPIER.RigidBody;
        object.position.copy(body.translation());
        object.quaternion.copy(body.rotation());
      }

      Object.keys(shader.uniforms).forEach((key) => {
        shader.uniforms[key].value = object.userData[key]
      })
      shader.uniformsNeedUpdate = true;
    }
  }

  if (object instanceof THREE.Light) {
    if (object instanceof THREE.PointLight) {
      object.distance = object.intensity;
      // console.log(object.name, object)
    }
  }
}