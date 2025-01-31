import * as THREE from "three";

export class ObjectMaterialData {
  color: THREE.Color
  emissive: THREE.Color
  emissiveIntensity: number
  customShader?: THREE.ShaderMaterial

  constructor() {
    this.color = new THREE.Color(0xffffff)
    this.emissive = new THREE.Color(0x000000)
    this.emissiveIntensity = 0.0
  }
}

export type SceneObject = THREE.Object3D & {
  material: ObjectMaterialData,
}

export const lampPost = () => {

  const b = baseObject()
  const pole = cylinderInstance()
  pole.scale.set(0.1, 5.0, 0.1)
  pole.position.add({ x: 0.0, y: 2.5, z: 0.0 })

  const rnd = Math.random()
  const color = rnd > 0.5 ? 0xffccaa : 0xffaa77

  const lamp = sphereInstance()
  lamp.material.emissive.setHex(color).multiplyScalar(15.0)
  lamp.scale.setScalar(0.4)
  lamp.position.add({ x: 0, y: 5.0, z: 0.0 })
  b.add(lamp)

  const light = new THREE.PointLight(color, 20.0)
  lamp.add(light)

  b.add(pole)

  return b
}

export const boxInstance = () => {
  const b = baseObject()
  b.userData.box = true
  return b
}

export const sphereInstance = () => {
  const b = baseObject()
  b.userData.sphere = true
  return b
}

export const cylinderInstance = () => {
  const b = baseObject()
  b.userData.cylinder = true
  return b
}

function baseObject() {
  const b = new THREE.Object3D() as SceneObject
  b.material = new ObjectMaterialData()
  return b
}