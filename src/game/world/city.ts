import * as THREE from "three";
import { boxInstance, cylinderInstance, lampPost } from "./objects";
import { HIGHWAY_HEIGHT, HIGHWAY_WIDTH } from "./highway";

const LANE_WIDTH = 3;
const SIDEWALK_WIDTH = 2;
const MIN_BLOCK_SIZE = 10;
const LAMPPOST_INTERVAL = 20;
const BUILDING_SIZE = 10;

class Road {
  start: THREE.Vector2;
  end: THREE.Vector2;
  topLeft: THREE.Vector2;
  bottomRight: THREE.Vector2;
  direction: THREE.Vector2;
  lanes: number;
  intersections: { position: THREE.Vector2, road: Road }[] = [];

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
  }

  toObject3D() {
    const obj = new THREE.Object3D();
    const b = boxInstance()

    b.material.color.multiplyScalar(0.3 + 0.1 * Math.random());

    const center = new THREE.Vector2().addVectors(this.start, this.end).multiplyScalar(0.5);
    b.position.set(center.x, 0, center.y);
    b.scale.set(
      this.topLeft.x - this.bottomRight.x,
      1.0,
      this.topLeft.y - this.bottomRight.y,
    )
    obj.add(b);
    this.getLampPosts().forEach(lamp => obj.add(lamp));
    return obj;
  }

  getLampPosts() {
    const length = this.start.distanceTo(this.end);
    const numLamps = Math.floor(length / LAMPPOST_INTERVAL);
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

class CityBlock {
  topLeft: THREE.Vector2;
  bottomRight: THREE.Vector2;
  left: Road|null = null;
  right: Road|null = null;
  top: Road|null = null;
  bottom: Road|null = null;
  lanes: number;
  highwayPoints: THREE.Vector2[] = [];

  constructor(topLeft: THREE.Vector2, bottomRight: THREE.Vector2, lanes: number) {
    this.topLeft = topLeft;
    this.bottomRight = bottomRight;
    this.lanes = lanes;
  }

  toObject3D() {
    const obj = new THREE.Object3D();
    const b = boxInstance()
    const center = new THREE.Vector2().addVectors(this.topLeft, this.bottomRight).multiplyScalar(0.5);
    b.position.set(center.x, 0, center.y);
    b.scale.set(
      this.topLeft.x - this.bottomRight.x,
      1.5,
      this.topLeft.y - this.bottomRight.y,
    )
    obj.add(b);
    this.getBuildings().forEach(building => obj.add(building));
    return obj;
  }

  getBuildings() {
    const innerWidth = this.bottomRight.x - this.topLeft.x - 2 * SIDEWALK_WIDTH;
    const innerHeight = this.bottomRight.y - this.topLeft.y - 2 * SIDEWALK_WIDTH;

    let numBuildingsW = Math.floor(innerWidth / BUILDING_SIZE);
    let numBuildingsH = Math.floor(innerHeight / BUILDING_SIZE);

    // Make the smaller at most 2
    if (numBuildingsW < numBuildingsH) {
      numBuildingsW = Math.min(numBuildingsW, 2);
    } else {
      numBuildingsH = Math.min(numBuildingsH, 2);
    }

    const offsetW = innerWidth / numBuildingsW;
    const offsetH = innerHeight / numBuildingsH;

    const buildings = [];

    for (let i = 0; i < numBuildingsW; i++) {
      for (let j = 0; j < numBuildingsH; j++) {

        let roadLanes = 2;
        if (i === 0) {
          roadLanes = this.left?.lanes || 0;
        } else if (i === numBuildingsW - 1) {
          roadLanes = this.right?.lanes || 0;
        } 
        if (j === 0) {
          roadLanes += this.top?.lanes || 0;
        } else if (j === numBuildingsH - 1) {
          roadLanes += this.bottom?.lanes || 0;
        }

        const center = new THREE.Vector2(
          this.topLeft.x + SIDEWALK_WIDTH + offsetW * i + 0.5 * offsetW,
          this.topLeft.y + SIDEWALK_WIDTH + offsetH * j + 0.5 * offsetH,
        );

        if (this.highwayPoints.some(point =>
          point.distanceTo(center) < HIGHWAY_WIDTH + Math.max(offsetW, offsetH))
        ) {
          continue;
        }

        const building = boxInstance();

        building.material.color.multiplyScalar(0.5 + 0.5 * Math.random());

        const height = 5 + 4 * roadLanes * Math.random();
        building.position.set(center.x, height / 2, center.y);
        building.scale.set(offsetW, height, offsetH);
        buildings.push(building);
      }
    }

    // Add highway pillars
    for (const point of this.highwayPoints) {
      if (rectangleSDF(this.topLeft, this.bottomRight, point) < -0.5 - SIDEWALK_WIDTH) {
        const pillar = cylinderInstance();
        pillar.material.color.set(0xaaaaaa);
        pillar.position.set(point.x, HIGHWAY_HEIGHT/2, point.y);
        pillar.scale.set(1, HIGHWAY_HEIGHT, 1);
        buildings.push(pillar);
      }
    }

    return buildings;
  }
}

export const generate = (width: number, height: number, highwayPath: THREE.CatmullRomCurve3) => {
  const finalBlocks: CityBlock[] = [];
  const finalRoads: Road[] = [];

  const rootBlock = new CityBlock(new THREE.Vector2(0, 0), new THREE.Vector2(width, height), 8);

  rootBlock.highwayPoints = getHighwayPoints(
    highwayPath.getSpacedPoints(100).map(p => new THREE.Vector2(p.x, p.z)),
    rootBlock
  );

  const queue: CityBlock[] = [rootBlock];

  while (queue.length > 0) {
    const block = queue.shift()!;
    const width = block.bottomRight.x - block.topLeft.x;
    const height = block.bottomRight.y - block.topLeft.y;
    const minSplitSize = 2 * (MIN_BLOCK_SIZE + block.lanes * LANE_WIDTH);
  
    if (width < minSplitSize || height < minSplitSize) {
      finalBlocks.push(block);
      continue;
    }

    const newLanes = Math.max(2, block.lanes - 2);
    const roadWidth = newLanes * LANE_WIDTH;

    // Pick a weighted random direction to split the block
    const rnd = Math.random() * (width + height);

    const verticalTooSmall = height < minSplitSize;
  
    if (rnd < width || verticalTooSmall) {
      // Split vertically
      const split = 0.5 * width;
      const road = new Road(
        new THREE.Vector2(block.topLeft.x + split, block.topLeft.y),
        new THREE.Vector2(block.topLeft.x + split, block.bottomRight.y),
        newLanes,
        new THREE.Vector2(0, 1),
      )

      finalRoads.push(road);

      const left = new CityBlock(
        block.topLeft,
        new THREE.Vector2(block.topLeft.x + split - roadWidth / 2, block.bottomRight.y),
        newLanes,
      );

      left.left = block.left;
      left.top = block.top;
      left.right = road;
      left.bottom = block.bottom;

      left.highwayPoints = getHighwayPoints(block.highwayPoints, left);

      const right = new CityBlock(
        new THREE.Vector2(block.topLeft.x + split + roadWidth / 2, block.topLeft.y),
        block.bottomRight,
        newLanes,
      );

      right.left = road;
      right.top = block.top;
      right.right = block.right;
      right.bottom = block.bottom;

      right.highwayPoints = getHighwayPoints(block.highwayPoints, right);

      queue.push(left, right);
    } else {
      // Split horizontally
      const split = 0.5 * height;

      const road = new Road(
        new THREE.Vector2(block.topLeft.x, block.topLeft.y + split),
        new THREE.Vector2(block.bottomRight.x, block.topLeft.y + split),
        newLanes,
        new THREE.Vector2(1, 0),
      );

      finalRoads.push(road);

      const top = new CityBlock(
        block.topLeft,
        new THREE.Vector2(block.bottomRight.x, block.topLeft.y + split - roadWidth / 2),
        newLanes,
      );

      top.left = block.left;
      top.top = block.top;
      top.right = block.right;
      top.bottom = road;

      top.highwayPoints = getHighwayPoints(block.highwayPoints, top);

      const bottom = new CityBlock(
        new THREE.Vector2(block.topLeft.x, block.topLeft.y + split + roadWidth / 2),
        block.bottomRight,
        newLanes,
      );

      bottom.left = block.left;
      bottom.top = road;
      bottom.right = block.right;
      bottom.bottom = block.bottom;

      bottom.highwayPoints = getHighwayPoints(block.highwayPoints, bottom);

      queue.push(top, bottom);
    }
  }

  return { blocks: finalBlocks, roads: finalRoads };
};

const getHighwayPoints = (points: THREE.Vector2[], block: CityBlock) => {
  return points.filter(p => rectangleSDF(block.topLeft, block.bottomRight, p) < HIGHWAY_WIDTH);
}

const rectangleSDF = (topLeft: THREE.Vector2, bottomRight: THREE.Vector2, point: THREE.Vector2): number => {
  const dx = Math.max(topLeft.x - point.x, point.x - bottomRight.x);
  const dy = Math.max(topLeft.y - point.y, point.y - bottomRight.y);
  return Math.max(dx, dy);
}