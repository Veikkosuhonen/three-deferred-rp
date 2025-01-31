import * as THREE from 'three';
import { boxInstance, lampPost } from './objects';
import { LAMPPOST_INTERVAL, LANE_WIDTH } from './constants';

export class Road {
  height = 0.0;
  thickness = 1.0;
  start: THREE.Vector2;
  end: THREE.Vector2;
  topLeft: THREE.Vector2;
  bottomRight: THREE.Vector2;
  direction: THREE.Vector2;
  lanes: number;
  intersections: { position: THREE.Vector2, road: Road }[] = [];
  length: number

  constructor(start: THREE.Vector2, end: THREE.Vector2, lanes: number, direction: THREE.Vector2) {
    this.start = start;
    this.end = end;
    this.lanes = lanes;
    this.direction = direction;

    const halfWidth = 0.5 * lanes * LANE_WIDTH;
    const perpendicular = new THREE.Vector2(direction.y, direction.x).multiplyScalar(halfWidth);

    this.topLeft = new THREE.Vector2(
      start.x,
      start.y,
    ).sub(perpendicular);
    this.bottomRight = new THREE.Vector2(
      end.x,
      end.y,
    ).add(perpendicular);

    this.length = start.distanceTo(end);
  }

  toObject3D() {
    const obj = new THREE.Object3D();
  
    if (this.height > 0) {
      const b = boxInstance();
      b.material.color.multiplyScalar(0.6 + 0.1 * Math.random());

      const center = new THREE.Vector2().addVectors(this.start, this.end).multiplyScalar(0.5);
      b.position.set(center.x, this.height - this.thickness/2, center.y);
      b.scale.set(
        this.topLeft.x - this.bottomRight.x,
        this.thickness,
        this.topLeft.y - this.bottomRight.y,
      )
      obj.add(b);
    }
  
    // this.getLampPosts().forEach(lamp => obj.add(lamp));
    return obj;
  }

  getLampPosts() {
    const numLamps = Math.floor(this.length / LAMPPOST_INTERVAL);
    const offset = this.direction.clone().multiplyScalar(length / numLamps);
    const lamps = [];
    for (let i = 0; i < numLamps; i++) {
      const position = this.start.clone().add(offset.clone().multiplyScalar(i));
      const lamp = lampPost();
      lamp.position.set(position.x, 0, position.y);
      lamps.push(lamp);
    }
    return lamps;
  }
}
