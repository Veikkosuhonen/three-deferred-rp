import * as THREE from "three";

export const lampPost = () => {

  const b = new THREE.Object3D()
  const pole = cylinderInstance()
  pole.scale.set(0.1, 5.0, 0.1)
  pole.position.add({ x: 0.0, y: 2.5, z: 0.0 })

  const rnd = Math.random()
  const color = rnd > 0.5 ? 0xffffff : 0xffccaa

  const lamp = sphereInstance()
  lamp.scale.setScalar(0.4)
  lamp.position.add({ x: 0, y: 5.0, z: 0.0 })
  b.add(lamp)

  const light = new THREE.PointLight(color, 20.0)
  lamp.add(light)

  b.add(pole)

  return b
}

export const boxInstance = () => {
  const b = new THREE.Object3D()
  b.userData.box = true
  return b
}

export const sphereInstance = () => {
  const b = new THREE.Object3D()
  b.userData.sphere = true
  return b
}

export const cylinderInstance = () => {
  const b = new THREE.Object3D()
  b.userData.cylinder = true
  return b
}