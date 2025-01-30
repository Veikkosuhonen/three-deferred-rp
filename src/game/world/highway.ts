import * as THREE from "three";
import { lampPost } from "./objects";

export const HIGHWAY_WIDTH = 8;
export const HIGHWAY_THICKNESS = 1;
export const HIGHWAY_HEIGHT = 15;

const HIGHWAY_STEP = 150;

export const generateHighway = (
  width: number,
  height: number,
) => {
  const path: THREE.Vector3[] = []
  const dir = new THREE.Vector2(1, 0)
  const currentPos = new THREE.Vector2(0.01, height / 2)
  
  do {

    path.push(new THREE.Vector3(currentPos.x, 0, currentPos.y));

    const offset = dir.clone().multiplyScalar(HIGHWAY_STEP);

    currentPos.add(offset)

    const angleChange = 1.5 * Math.PI / 2 * (Math.random() - 0.5)
    dir.rotateAround(new THREE.Vector2(0, 0), angleChange)

    if (dir.angleTo(new THREE.Vector2(1, 0)) > Math.PI / 4) {
      dir.rotateAround(new THREE.Vector2(0, 0), -2 * angleChange)
    }
  } while(currentPos.x < width && currentPos.y < height && currentPos.y > 0)

  const spline = new THREE.CatmullRomCurve3(path)

  const obj = new THREE.Object3D()

  const numLamps = spline.getLength() / 20
  for (const pos of spline.getSpacedPoints(numLamps)) {
    const l = lampPost()
    l.position.copy(pos)
    obj.add(l)
  }

  const shape = new THREE.Shape([
    new THREE.Vector2(-HIGHWAY_THICKNESS, -HIGHWAY_WIDTH),
    new THREE.Vector2(HIGHWAY_THICKNESS, -HIGHWAY_WIDTH),
    new THREE.Vector2(HIGHWAY_THICKNESS, HIGHWAY_WIDTH),
    new THREE.Vector2(-HIGHWAY_THICKNESS, HIGHWAY_WIDTH),
  ])

  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: false,
    extrudePath: spline,
    steps: 200,
  })

  obj.add(new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial()))

  return {
    obj,
    path: spline,
  }
};