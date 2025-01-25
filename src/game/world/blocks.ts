import * as THREE from "three"
import { generate } from "./city"

export type BlockGen = () => THREE.Object3D

type GeneratorResult = {
  props: THREE.Object3D,
  lights: THREE.Object3D,
}

export const grid = {
  width: 1000,
  height: 1000,
  cellWidth: 8,
  cellHeight: 8,

  generate(): GeneratorResult {
    const group = new THREE.Group()
    group.position.set(-this.width/4, 0, -this.height/4)

    const { blocks, roads } = generate(this.width, this.height)
    blocks.forEach(block => group.add(block.toObject3D()))
    roads.forEach(road => group.add(road.toObject3D())) 

    const lightDatas: THREE.PointLight[] = []

    const boxMatrices: THREE.Matrix4[] = []
    const sphereMatrices: THREE.Matrix4[] = []
    const cylinderMatrices: THREE.Matrix4[] = []

    const toRemove: THREE.Object3D[] = []
  
    group.traverse(obj => {
      obj.updateMatrixWorld()
      let remove = true
    
      if (obj.userData.box) {
        boxMatrices.push(obj.matrixWorld)
      } else if (obj.userData.sphere) {
        sphereMatrices.push(obj.matrixWorld)
      } else if (obj.userData.cylinder) {
        cylinderMatrices.push(obj.matrixWorld)
      } else {
        remove = false
      }

      if (remove) {
        toRemove.push(obj)
      }

      if (obj instanceof THREE.PointLight) {
        obj.scale.setScalar(3 * obj.intensity)
        obj.updateMatrixWorld()

        lightDatas.push(obj)
      }
    })

    toRemove.forEach(obj => obj.removeFromParent())

    group.add(this.buildInstanced(
      new THREE.BoxGeometry(),
      new THREE.MeshPhysicalMaterial(),
      boxMatrices,
    ))

    group.add(this.buildInstanced(
      new THREE.SphereGeometry(),
      new THREE.MeshPhysicalMaterial({
        emissiveIntensity: 8.0, emissive: 0xffffff,
      }),
      sphereMatrices,
    ))

    group.add(this.buildInstanced(
      new THREE.CylinderGeometry(),
      new THREE.MeshPhysicalMaterial(),
      cylinderMatrices
    ))

    const lights = new THREE.Group()
    lights.position.copy(group.position)
    lights.add(this.buildInstancedLights(lightDatas))

    return {
      props: group,
      lights
    }
  },

  buildInstanced(geom: THREE.BufferGeometry, mat: THREE.MeshPhysicalMaterial, matrices: THREE.Matrix4[]): THREE.InstancedMesh {
    const instanced = new THREE.InstancedMesh(geom, mat, matrices.length)
    for (let i = 0; i < matrices.length; i++) {
      const m = matrices[i];
      instanced.setMatrixAt(i, m)
    }
    instanced.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    instanced.instanceMatrix.needsUpdate = true;
    return instanced
  },

  buildInstancedLights(lightDatas: THREE.PointLight[]): THREE.Mesh {
    const sphereGeometry = new THREE.SphereGeometry()
  
    const lightInstanced = new THREE.InstancedBufferGeometry()
    lightInstanced.index = sphereGeometry.index
    lightInstanced.attributes.position = sphereGeometry.attributes.position

    const matrixArray = new Float32Array(lightDatas.length * 16)
    const colorArray = new Float32Array(lightDatas.length * 3)
    const intensityArray = new Float32Array(lightDatas.length)

    for (let i = 0; i < lightDatas.length; i++) {
      const light = lightDatas[i]

      light.matrixWorld.toArray(matrixArray, i * 16)
      light.color.toArray(colorArray, i * 3)
      intensityArray[i] = light.intensity
    }

    lightInstanced.setAttribute('instanceMatrix', new THREE.InstancedBufferAttribute(matrixArray, 16))
    lightInstanced.setAttribute('color', new THREE.InstancedBufferAttribute(colorArray, 3))
    lightInstanced.setAttribute('intensity', new THREE.InstancedBufferAttribute(intensityArray, 1))

    const lights = new THREE.Mesh(lightInstanced,);

    lights.frustumCulled = false

    return lights
  },
}
