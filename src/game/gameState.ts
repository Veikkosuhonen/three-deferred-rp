import RAPIER from "@dimforge/rapier3d";
import { ISheet } from "@theatre/core";
import * as THREE from "three";

export class Game {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  lights: THREE.Scene;
  mainCamera: THREE.PerspectiveCamera
  world: RAPIER.World;
  sheet: ISheet;
  loadingManager: THREE.LoadingManager;

  constructor(renderer: THREE.WebGLRenderer, mainCamera: THREE.PerspectiveCamera, sheet: ISheet, loadingManager: THREE.LoadingManager) {
    this.renderer = renderer
    this.scene = new THREE.Scene();
    this.lights = new THREE.Scene();
    this.mainCamera = mainCamera
    this.sheet = sheet;
    this.loadingManager = loadingManager

    this.world = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0));
  }
}