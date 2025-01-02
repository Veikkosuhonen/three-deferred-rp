import * as THREE from "three"

export type BlockGen = () => THREE.Object3D

export const grid = {
  width: 40,
  height: 40,
  cellWidth: 9,
  cellHeight: 9,

  generate() {
    const group = new THREE.Group()
    group.position.set(-this.cellWidth * this.width / 2, 0, -this.cellHeight * this.height / 2)

    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        group.add(this.generateCell(i, j))
      }
    }

    return group
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
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(this.cellWidth, 10.0, this.cellHeight),
      new THREE.MeshPhysicalMaterial(),
    )

    const b1 = b.clone()
    b1.scale.set(0.9, 0.9, 0.9)
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
    const b1 = new THREE.Mesh(
      new THREE.BoxGeometry(this.cellWidth, 20.0, this.cellHeight),
      new THREE.MeshPhysicalMaterial(),
    )
    b1.scale.set(0.8, 1.0, 0.8)
    b1.position.add({ x: 0, y: 15, z: 0 })

    b.add(b1)

    return b
  },

  lampPost(): THREE.Object3D {

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 10.0),
      new THREE.MeshPhysicalMaterial(),
    )

    pole.position.add({ x: 0.0, y: 10.0, z: 0.0 })

    const rnd = Math.random()
    const color = rnd > 0.5 ? 0xffffff : 0xffccaa

    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(1.0),
      new THREE.MeshPhysicalMaterial({
        emissiveIntensity: 8.0, emissive: color,
      }),
    )

    lamp.position.add({ x: 0, y: 5.0, z: 0.0 })

    pole.add(lamp)

    const light = new THREE.PointLight(color, 15.0)
    lamp.add(light)

    return pole
  }
}
