import * as THREE from "three"

export type BlockGen = () => THREE.Object3D

type InstancedGroup = {
  geometry: THREE.BufferGeometry,
  items: {
    matrix: THREE.Matrix4,
  }[]
}

export const grid = {
  width: 100,
  height: 100,
  cellWidth: 9,
  cellHeight: 9,

  generate() {
    const group = new THREE.Group()

    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        group.add(this.generateCell(i, j))
      }
    }

    const boxMatrices: THREE.Matrix4[] = []
    const sphereMatrices: THREE.Matrix4[] = []
    const cylinderMatrices: THREE.Matrix4[] = []
  
    group.traverse(obj => {
      obj.updateMatrixWorld()

      if (obj.userData.box) {
        boxMatrices.push(obj.matrixWorld)
      }
      if (obj.userData.sphere) {
        sphereMatrices.push(obj.matrixWorld)
      }
      if (obj.userData.cylinder) {
        cylinderMatrices.push(obj.matrixWorld)
      }
    })

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

    group.position.set(-this.cellWidth * this.width / 2, 0, -this.cellHeight * this.height / 2)

    return group
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

  generateCell(i: number, j: number): THREE.Object3D {
    const rnd = Math.random() * 3
    let block: THREE.Object3D;

    if (rnd > 2) {
      block = this.houseBlock()
    } else if (rnd > 1) {
      block = this.lampPostBlock()
    } else {
      block = this.basicBlock()
    }

    block.position.set(i * this.cellHeight, 0.0, j * this.cellWidth);

    return block
  },

  basicBlock(): THREE.Object3D {
    const b = this.boxInstance()

    const b1 = b.clone()
    b1.scale.set(this.cellWidth, 10.0, this.cellHeight)
    b1.scale.multiplyScalar(0.9)
    b1.position.add({ x: 0, y: 1, z: 0 })

    b.add(b1)

    return b
  },

  lampPostBlock(): THREE.Object3D {
    const b = this.basicBlock()
    b.add(this.lampPost())
    return b;
  },

  houseBlock(): THREE.Object3D {
    const b = this.basicBlock()
    const b1 = this.boxInstance()
    b1.scale.set(0.8 * this.cellWidth, 10.0 + 20 * Math.random(), 0.8 * this.cellHeight)
    b1.position.add({ x: 0, y: 15, z: 0 })

    b.add(b1)

    return b
  },

  lampPost(): THREE.Object3D {

    const b = new THREE.Object3D()
    const pole = this.cylinderInstance()
    pole.scale.set(0.5, 10.0, 0.5)
    pole.position.add({ x: 0.0, y: 10.0, z: 0.0 })

    const rnd = Math.random()
    const color = rnd > 0.5 ? 0xffffff : 0xffccaa

    const lamp = this.sphereInstance()
    lamp.position.add({ x: 0, y: 15.0, z: 0.0 })
    b.add(lamp)

    const light = new THREE.PointLight(color, 15.0)
    lamp.add(light)

    b.add(pole)

    return b
  },

  boxInstance(): THREE.Object3D {
    const b = new THREE.Object3D()
    b.userData.box = true
    return b
  },

  sphereInstance(): THREE.Object3D {
    const b = new THREE.Object3D()
    b.userData.sphere = true
    return b
  },

  cylinderInstance(): THREE.Object3D {
    const b = new THREE.Object3D()
    b.userData.cylinder = true
    return b
  }
}
