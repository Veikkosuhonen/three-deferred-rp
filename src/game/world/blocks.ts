import * as THREE from "three"
import { generate } from "./city"
import { generateHighway } from "./highway"
import { SceneObject } from "./objects"
import { Road } from "./Road"
import { Car } from "./Car"

export type BlockGen = () => THREE.Object3D

type GeneratorResult = {
  props: THREE.Object3D,
  lights: THREE.Object3D,
  entities: Entity[],
}

export interface Entity {
  update(deltaTime: number): void
}

export const grid = {
  width: 1000,
  height: 1000,

  generate(): GeneratorResult {
    console.time('generate')

    const group = new THREE.Group()
    const lights = new THREE.Group()
    const entities: Entity[] = []

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width, this.height),
      new THREE.MeshPhysicalMaterial()
    )
    ground.material.color.multiplyScalar(0.6);
    ground.rotation.x = -Math.PI / 2
    ground.position.set(this.width / 2, 0, this.height / 2)
    group.add(ground)

    // Highways
    const highways = [
      { dir: new THREE.Vector2(1, 0), bridgeHeight: 9 },
      { dir: new THREE.Vector2(0, 1), bridgeHeight: 17 },
    ].map(({ dir, bridgeHeight }) => {
      const { obj: highway, path } = generateHighway(this.width, this.height, dir)
      highway.position.set(0, bridgeHeight, 0)
      path.points.forEach(p => p.y = bridgeHeight)
      group.add(highway)
      return path
    })

    // City
    const instancedObjs = generate(this.width, this.height, highways)
    instancedObjs.forEach(obj => group.add(obj.toObject3D()))

    // Cars
    instancedObjs.filter(obj => obj instanceof Road).forEach(road => {
      for (let lane = 1; lane <= road.lanes/2; lane++) {
        for (let pos = 0; pos < road.length; pos += 10) {
          if (Math.random() > 0.2) continue;

          const car = new Car(road, pos, lane)
          entities.push(car)
          group.add(car.object)
          lights.add(car.light)
        }
      }
    })

    const lightDatas: THREE.PointLight[] = []

    const boxesCustomShader: SceneObject[] = []
    const boxes: SceneObject[] = []
    const spheres: SceneObject[] = []
    const cylinders: SceneObject[] = []

    const toRemove: THREE.Object3D[] = []
  
    group.traverse(obj => {
      obj.updateMatrixWorld()
      let remove = true
    
      if (obj.userData.box) {
        const obj1 = obj as SceneObject
        if (obj1.material.customShader) {
          boxesCustomShader.push(obj1)
        } else {
          boxes.push(obj1)
        }
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

    console.table({
      boxesCustomShader: boxesCustomShader.length,
      boxes: boxes.length,
      spheres: spheres.length,
      cylinders: cylinders.length,
      lights: lightDatas.length,
      entities: entities.length,
    })

    group.add(this.buildInstanced(
      new THREE.BoxGeometry(),
      boxesCustomShader,
    ))

    group.add(this.buildInstanced(
      new THREE.BoxGeometry(),
      boxes,
    ))

    group.add(this.buildInstanced(
      new THREE.SphereGeometry(1, 16, 8),
      spheres,
    ))

    group.add(this.buildInstanced(
      new THREE.CylinderGeometry(1, 1, 1, 16),
      cylinders
    ))

    lights.position.copy(group.position)
    lights.add(this.buildInstancedLights(lightDatas))

    console.timeEnd('generate')

    return {
      props: group,
      lights,
      entities,
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

    const mesh = new THREE.Mesh(instanced, objs[0].material.customShader ?? new THREE.MeshPhysicalMaterial())

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
