import { ISheet } from "@theatre/core";
import * as THREE from "three";
import { Entity } from "./world/blocks";

export class Game {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  lights: THREE.Scene;
  entities: Entity[] = [];
  mainCamera: THREE.PerspectiveCamera
  sheet: ISheet;
  loadingManager: THREE.LoadingManager;

  constructor(renderer: THREE.WebGLRenderer, mainCamera: THREE.PerspectiveCamera, sheet: ISheet, loadingManager: THREE.LoadingManager) {
    this.renderer = renderer
    this.scene = new THREE.Scene();
    this.lights = new THREE.Scene();
    this.mainCamera = mainCamera
    this.sheet = sheet;
    this.loadingManager = loadingManager
  }

  update(deltaTime: number) {
    this.entities.forEach(entity => entity.update(deltaTime))
  }
}