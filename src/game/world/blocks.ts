import * as THREE from "three"
import { generate } from "./city"
import { generateHighway } from "./highway"
import { SceneObject } from "./objects"

export type BlockGen = () => THREE.Object3D

type GeneratorResult = {
  props: THREE.Object3D,
  lights: THREE.Object3D,
}

export const grid = {
  width: 1000,
  height: 1000,

  generate(): GeneratorResult {
    console.time('generate')

    const group = new THREE.Group()
    // group.position.set(-this.width/4, 0, -this.height/4)

    const { obj: highway, path: highwayPath } = generateHighway(this.width, this.height)
    highway.position.set(0, 15, 0)
    group.add(highway)

    const { blocks, roads } = generate(this.width, this.height, highwayPath)
    blocks.forEach(block => group.add(block.toObject3D()))
    roads.forEach(road => group.add(road.toObject3D())) 

    const lightDatas: THREE.PointLight[] = []

    const boxes: SceneObject[] = []
    const spheres: SceneObject[] = []
    const cylinders: SceneObject[] = []

    const toRemove: THREE.Object3D[] = []
  
    group.traverse(obj => {
      obj.updateMatrixWorld()
      let remove = true
    
      if (obj.userData.box) {
        boxes.push(obj as SceneObject)
      } else if (obj.userData.sphere) {
        spheres.push(obj as SceneObject)
      } else if (obj.userData.cylinder) {
        cylinders.push(obj as SceneObject)
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
      boxes,
    ))

    group.add(this.buildInstanced(
      new THREE.SphereGeometry(),
      spheres,
    ))

    group.add(this.buildInstanced(
      new THREE.CylinderGeometry(),
      cylinders
    ))

    const lights = new THREE.Group()
    lights.position.copy(group.position)
    lights.add(this.buildInstancedLights(lightDatas))

    console.timeEnd('generate')

    return {
      props: group,
      lights
    }
  },

  buildInstanced(geom: THREE.BufferGeometry, objs: SceneObject[]): THREE.Mesh {
    const instanced = new THREE.InstancedBufferGeometry()
    instanced.index = geom.index
    instanced.attributes.position = geom.attributes.position
    instanced.attributes.normal = geom.attributes.normal

    const matrixArray = new Float32Array(objs.length * 16)
    const colorArray = new Float32Array(objs.length * 3)
    const emissiveArray = new Float32Array(objs.length * 3)

    for (let i = 0; i < objs.length; i++) {
      objs[i].matrixWorld.toArray(matrixArray, i * 16)
      objs[i].material.color.toArray(colorArray, i * 3)
      objs[i].material.emissive.toArray(emissiveArray, i * 3)
    }

    instanced.setAttribute('instanceMatrix', new THREE.InstancedBufferAttribute(matrixArray, 16))
    instanced.setAttribute('color', new THREE.InstancedBufferAttribute(colorArray, 3))
    instanced.setAttribute('emissive', new THREE.InstancedBufferAttribute(emissiveArray, 3))

    const mesh = new THREE.Mesh(instanced, new THREE.MeshPhysicalMaterial())

    mesh.userData.instanced = true;

    mesh.frustumCulled = false

    return mesh
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
