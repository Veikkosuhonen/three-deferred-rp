import * as THREE from "three";

export type SceneObject = THREE.Object3D & {
  material: THREE.MeshPhysicalMaterial
}

export const lampPost = () => {

  const b = new THREE.Object3D()
  const pole = cylinderInstance()
  pole.scale.set(0.1, 5.0, 0.1)
  pole.position.add({ x: 0.0, y: 2.5, z: 0.0 })

  const rnd = Math.random()
  const color = rnd > 0.5 ? 0xffffff : 0xffccaa

  const lamp = sphereInstance()
  lamp.material.emissive.setHex(color).multiplyScalar(20.0)
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

const baseObject = () => {
  const b = new THREE.Object3D() as SceneObject
  b.material = new THREE.MeshPhysicalMaterial()
  return b
}