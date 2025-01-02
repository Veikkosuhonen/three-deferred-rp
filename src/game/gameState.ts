import RAPIER from "@dimforge/rapier3d";
import { ISheet } from "@theatre/core";
import * as THREE from "three";

export class Game {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  mainCamera: THREE.PerspectiveCamera
  world: RAPIER.World;
  sheet: ISheet;
  loadingManager: THREE.LoadingManager;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, mainCamera: THREE.PerspectiveCamera, sheet: ISheet, loadingManager: THREE.LoadingManager) {
    this.renderer = renderer
    this.scene = scene;
    this.mainCamera = mainCamera
    this.sheet = sheet;
    this.loadingManager = loadingManager

    this.world = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0));
  }
}