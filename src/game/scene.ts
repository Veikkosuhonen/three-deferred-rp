import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gBufferShaderVariants, getVariantKey } from './shaders/gbuffer';
import { ISheet } from '@theatre/core';
import { connectObjectToTheatre } from './theatreThree';
import { Game } from './gameState';
import RAPIER from "@dimforge/rapier3d";
import { basicRtMaterial } from './materials/basicRtMaterial';
import { grid } from './world/blocks';

export const setupScene = (game: Game) => {
  const { props, lights } = grid.generate()
  game.scene.add(props)
  game.lights.add(lights)

  game.scene.traverse(obj => configureSceneObjects(obj, game))
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

  object.userData.previousWorldMatrix = object.matrixWorld;
  if (object.userData.isDynamic) {
    object.onAfterRender = () => {
      object.userData.previousWorldMatrix.copy(object.matrixWorld);
    }
  }

  if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
    const variantKey = getVariantKey(!!object.material.map, !!object.material.normalMap, !!object.material.roughnessMap, !!object.material.emissiveMap, object instanceof THREE.InstancedMesh);
    const shader = gBufferShaderVariants[variantKey];

    shader.userData.materialKeys.forEach((key: string) => {
      const materialProperty = (object.material as Record<string, any>)[key];
      if (materialProperty !== undefined) {
        object.userData[key] = materialProperty;
      } else {
        console.warn(`Object missing property ${key}`, object)
      }
    })

    object.material = shader;

    object.onBeforeRender = () => {
      shader.uniforms.previousWorldMatrix.value.copy(object.userData.previousWorldMatrix);
    
      if (object.userData.isDynamic) {
        const body = object.userData.body as RAPIER.RigidBody;
        object.position.copy(body.translation());
        object.quaternion.copy(body.rotation());
      }

      shader.userData.materialKeys.forEach((key: string) => {
        shader.uniforms[key].value = object.userData[key]
      })

      shader.uniformsNeedUpdate = true
    }
  }
}