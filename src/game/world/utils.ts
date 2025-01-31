import * as THREE from 'three';
import { CityBlock } from './CityBlock';
import { HIGHWAY_WIDTH } from './highway';

export const getHighwayPoints = (points: THREE.Vector2[], block: CityBlock) => {
  return points.filter(p => rectangleSDF(block.topLeft, block.bottomRight, p) < HIGHWAY_WIDTH);
}

export const rectangleSDF = (topLeft: THREE.Vector2, bottomRight: THREE.Vector2, point: THREE.Vector2): number => {
  const dx = Math.max(topLeft.x - point.x, point.x - bottomRight.x);
  const dy = Math.max(topLeft.y - point.y, point.y - bottomRight.y);
  return Math.max(dx, dy);
}