import RAPIER from "@dimforge/rapier3d";
import { ISheet } from "@theatre/core";
import * as THREE from "three";

export class Game {
  RAPIER: typeof RAPIER;
  world: RAPIER.World;
  sheet: ISheet;
  loadingManager: THREE.LoadingManager;

  constructor(rapier: typeof RAPIER, sheet: ISheet, loadingManager: THREE.LoadingManager) {
    this.RAPIER = rapier;
    this.sheet = sheet;
    this.loadingManager = loadingManager

    this.world = new rapier.World(new rapier.Vector3(0, -9.81, 0));
  }
}