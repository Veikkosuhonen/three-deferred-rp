import { ISheet } from "@theatre/core";
import * as THREE from "three";
import { Entity } from "./world/blocks";
import { MATRIX } from "./math";
import { carLightPositions } from "./world/Car";
import { setupTextCamera } from "./textCamera";

export class Game {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene = new THREE.Scene();
  lights: THREE.Scene = new THREE.Scene();
  texts: THREE.Scene = new THREE.Scene();
  entities: Entity[] = [];
  mainCamera: THREE.PerspectiveCamera;
  textCamera: THREE.PerspectiveCamera;
  uiCamera: THREE.OrthographicCamera;
  sheet: ISheet;
  loadingManager: THREE.LoadingManager;

  constructor(renderer: THREE.WebGLRenderer, mainCamera: THREE.PerspectiveCamera, sheet: ISheet, loadingManager: THREE.LoadingManager) {
    this.renderer = renderer
    this.mainCamera = mainCamera
    this.textCamera = setupTextCamera(mainCamera);
    this.sheet = sheet;
    this.loadingManager = loadingManager
    this.uiCamera = new THREE.OrthographicCamera()
  }

  update(deltaTime: number) {
    this.entities.forEach(entity => entity.update(deltaTime))
  
    const carLights = this.lights.children.find(l => l.userData.carLights) as THREE.Mesh | undefined;
    if (carLights) {
      const geometry = carLights.geometry as THREE.InstancedBufferGeometry;
      const attribute = geometry.getAttribute("instanceMatrix");
      const buffer = attribute.array as Float32Array;
      // console.log("Updating car lights positions", carLights.count, carLightPositions.length);
      for (let i = 0; i < carLightPositions.length; i++) {

        MATRIX.fromArray(buffer, i * 16);
        MATRIX.setPosition(carLightPositions[i]);
        MATRIX.toArray(buffer, i * 16);
      }
      attribute.needsUpdate = true;
    }
  }
}