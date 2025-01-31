import * as THREE from 'three';
import { Road } from './Road';
import { LANE_WIDTH } from './constants';

export class Car {
  road: Road;
  position: number;
  lane: number;
  object: THREE.Object3D;
  light: THREE.PointLight;
  direction: number = 1.0;
  speed: number;

  constructor(road: Road, position: number, lane: number) {
    this.road = road;
    this.position = position;
    this.lane = lane - 0.5;
    this.speed = 1.0 + road.lanes/4 + Math.random();

    this.object = new THREE.Object3D();
    this.object.add(new THREE.Mesh(
      new THREE.BoxGeometry(2, 1.55, 4.7),
      new THREE.MeshPhysicalMaterial({ color: 0xff0000, roughness: 0.1 })
    ));
    this.object.position.set(road.start.x, 0.8, road.start.y);
    this.object.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.atan2(road.direction.x, road.direction.y));

    this.light = new THREE.PointLight(0xffffff, 20.0);
  }

  update(deltaTime: number) {
    this.position += this.direction * deltaTime * this.speed;
    if (this.position > this.road.length) {
      this.position = this.road.length;
      this.direction = -1.0;
      this.lane = -this.lane;
    } else if (this.position < 0.0) {
      this.position = 0.0;
      this.direction = 1.0;
      this.lane = -this.lane;
    }
    const offset = this.road.direction.clone().multiplyScalar(this.position);
    const laneOffset = new THREE.Vector2(this.road.direction.y, -this.road.direction.x)
      .multiplyScalar((-this.lane) * LANE_WIDTH);
    this.object.position.set(this.road.start.x + offset.x + laneOffset.x, 0.8, this.road.start.y + offset.y + laneOffset.y);
    this.light.position.set(this.object.position.x, this.object.position.y + 1.0, this.object.position.z);
  }
}