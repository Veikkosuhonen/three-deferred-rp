import RAPIER from "@dimforge/rapier3d";
import { ISheet } from "@theatre/core";
import * as THREE from "three";

export class Game {
  world: RAPIER.World;
  sheet: ISheet;
  loadingManager: THREE.LoadingManager;

  constructor(sheet: ISheet, loadingManager: THREE.LoadingManager) {
    this.sheet = sheet;
    this.loadingManager = loadingManager

    this.world = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0));
  }
}