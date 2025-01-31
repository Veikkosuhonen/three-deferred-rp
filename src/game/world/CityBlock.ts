import * as THREE from 'three';
import { boxInstance, cylinderInstance, lampPost, SceneObject } from './objects';
import { rectangleSDF } from './utils';
import { HIGHWAY_HEIGHT, HIGHWAY_WIDTH } from './highway';
import { BUILDING_SIZE, LAMPPOST_INTERVAL, SIDEWALK_WIDTH } from './constants';
import { buildingMaterial } from '../materials/building';
import { Road } from './Road';

export class CityBlock {
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

  getRoads(): (Road|null)[] {
    return [
      this.left,
      this.right,
      this.top,
      this.bottom
    ]
  }

  toObject3D() {
    const obj = new THREE.Object3D();
    const b = boxInstance()
    const center = new THREE.Vector2().addVectors(this.topLeft, this.bottomRight).multiplyScalar(0.5);
    b.position.set(center.x, 0, center.y);
    b.scale.set(
      this.topLeft.x - this.bottomRight.x,
      0.5,
      this.topLeft.y - this.bottomRight.y,
    )
    obj.add(b);
    this.getBuildings().forEach(building => obj.add(building));
    this.getSideWalkProps().forEach(prop => obj.add(prop));
    return obj;
  }

  getBuildings() {
    type BuildingSlot = SceneObject | "empty" | "reserved";

    const innerWidth = this.bottomRight.x - this.topLeft.x - 2 * SIDEWALK_WIDTH;
    const innerHeight = this.bottomRight.y - this.topLeft.y - 2 * SIDEWALK_WIDTH;

    let numBuildingsW = Math.floor(innerWidth / BUILDING_SIZE);
    let numBuildingsH = Math.floor(innerHeight / BUILDING_SIZE);

    const offsetW = innerWidth / numBuildingsW;
    const offsetH = innerHeight / numBuildingsH;

    const buildingsGrid: BuildingSlot[][] = Array(numBuildingsW).fill(null).map(() => Array(numBuildingsH).fill("empty"));

    let maxRoadLanes = 0;

    for (let i = 0; i < numBuildingsW; i++) {
      for (let j = 0; j < numBuildingsH; j++) {

        let roadLanes = 0;
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
      
        maxRoadLanes = Math.max(maxRoadLanes, roadLanes);

        // Building not next to road?
        if (roadLanes === 0) continue;

        const center = new THREE.Vector2(
          this.topLeft.x + SIDEWALK_WIDTH + offsetW * i + 0.5 * offsetW,
          this.topLeft.y + SIDEWALK_WIDTH + offsetH * j + 0.5 * offsetH,
        );

        // Intersects highway?
        if (this.highwayPoints.some(point =>
          point.distanceTo(center) < HIGHWAY_WIDTH + Math.max(offsetW, offsetH))
        ) {
          buildingsGrid[i][j] = "reserved";
          continue;
        }

        const building = boxInstance();
        building.material.customShader = buildingMaterial;
        building.material.color.multiplyScalar(0.3 + 0.6 * Math.random());

        const floorHeight = 3;
        const height = 1 + floorHeight * (2 + Math.round(2 * roadLanes * Math.random()));
        building.position.set(center.x, height / 2, center.y);
        building.scale.set(offsetW, height, offsetH);
        buildingsGrid[i][j] = building;
      }
    }

    // Iterate corners. These can be turned into a big building
    for (const i of [0, numBuildingsW - 1]) {
      for (const j of [0, numBuildingsH - 1]) {
        if (buildingsGrid[i][j] === "reserved" || buildingsGrid[i][j] === "empty") continue;
        // Chance of big building
        if (Math.random() > maxRoadLanes * 0.01) continue;
        const building = buildingsGrid[i][j];
        const newCenterOffset = new THREE.Vector2(0, 0);
        let wScale = 1;
        let hScale = 1;

        // Iterate neighbours
        for (const [di, dj] of [
          [-1, -1], [-1, 0], [-1, 1],
          [0,  -1], [0,  1], 
          [1,  -1], [1,  0], [1,  1]
        ]) {
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || ni >= numBuildingsW || nj < 0 || nj >= numBuildingsH) continue;
          if (buildingsGrid[ni][nj] === "reserved") continue;
          buildingsGrid[ni][nj] = "reserved";
          newCenterOffset.add(new THREE.Vector2(
            di * offsetH / 2,
            dj * offsetW / 2,
          ));
          wScale = Math.min(2, wScale + Math.abs(di));
          hScale = Math.min(2, hScale + Math.abs(dj));
        }

        const newCenter = new THREE.Vector2(
          building.position.x + newCenterOffset.x / 2,
          building.position.z + newCenterOffset.y / 2,
        );
  
        building.position.set(newCenter.x, building.position.y, newCenter.y);
        building.scale.set(
          wScale * offsetW,
          building.scale.y,
          hScale * offsetH,
        )
      }
    }

    // Finally, fill in empty slots with lamp posts
    for (let i = 0; i < numBuildingsW; i++) {
      for (let j = 0; j < numBuildingsH; j++) {
        if (buildingsGrid[i][j] === "empty") {
          const lamp = lampPost();
          lamp.position.set(
            this.topLeft.x + SIDEWALK_WIDTH + offsetW * i + 0.5 * offsetW,
            0.0,
            this.topLeft.y + SIDEWALK_WIDTH + offsetH * j + 0.5 * offsetH,
          );
          buildingsGrid[i][j] = lamp;
        }
      }
    }

    const buildings = buildingsGrid.flat().filter(b => b !== "empty" && b !== "reserved");

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

  getSideWalkProps() {
    const lampOffset = SIDEWALK_WIDTH / 4;
    const topLeft = new THREE.Vector2(this.topLeft.x + lampOffset, this.topLeft.y + lampOffset);
    const topRight = new THREE.Vector2(this.bottomRight.x - lampOffset, this.topLeft.y + lampOffset);
    const bottomRight = new THREE.Vector2(this.bottomRight.x - lampOffset, this.bottomRight.y - lampOffset);
    const bottomLeft = new THREE.Vector2(this.topLeft.x + lampOffset, this.bottomRight.y - lampOffset);
    const sidewalkCurves = ([
      this.top    ? new THREE.LineCurve(topLeft, topRight) : null,
      this.right  ? new THREE.LineCurve(topRight, bottomRight) : null,
      this.bottom ? new THREE.LineCurve(bottomRight, bottomLeft) : null,
      this.left   ? new THREE.LineCurve(bottomLeft, topLeft) : null,
    ].filter(Boolean) as THREE.LineCurve[]);

    const props: THREE.Object3D[] = [];

    sidewalkCurves.forEach(curve => {
      const nLamps = Math.floor(curve.getLength() / LAMPPOST_INTERVAL);
      curve.getSpacedPoints(nLamps).forEach((point) => {
        const lamp = lampPost();
        lamp.position.set(point.x, 0.0, point.y);
        lamp.scale.setScalar(0.5);
        props.push(lamp);
      })
    })

    return props;
  }
}