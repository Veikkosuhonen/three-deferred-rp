import * as THREE from 'three'
import Stats from "three/examples/jsm/libs/stats.module.js";
import { setupScene } from './scene';
import { MapControls, FirstPersonControls } from 'three/examples/jsm/Addons.js';
import studio from '@theatre/studio'
import { getProject } from '@theatre/core'
import { Game } from './gameState';
// import { createLines } from './lineRenderer';
import theatreProject from "./demo project.theatre-project-state.json";
import { setupPipeline } from './pipeline';

export const loadingManager = new THREE.LoadingManager();
export let onLoaded: () => void;

export const start = async (canvas: HTMLCanvasElement) => {
  studio.initialize();
  const project = getProject("demo project", { state: theatreProject });
  const sheet = project.sheet("demo sheet");
  onLoaded = () => sheet.sequence.play({ iterationCount: Infinity, rate: 1.5 });

  const renderer = setupRenderer(canvas);
  const camera = setupCamera();
  const game = new Game(renderer, camera, sheet, loadingManager);

  setupScene(game)

  const stats = setupStats();

  // const debugLines = createLines();
  const clock = new THREE.Clock();
  const controls = setupControls(game.mainCamera, renderer);

  const pipeline = await setupPipeline(game)

  const animate = () => {
    performance.clearMarks('start-frame');
    performance.mark('start-frame')

    stats.begin();
    controls.update(clock.getDelta() * 20.0);
    pipeline.render();
    // debugLines.updateFromBuffer(game.world.debugRender())
    // renderer.render(debugLines.lines, game.mainCamera);
    game.mainCamera.userData.previousViewMatrix.copy(game.mainCamera.matrixWorldInverse);
    stats.end();

    performance.clearMarks('end-frame');
    performance.mark('end-frame');
    performance.clearMeasures('frame');
    performance.measure('frame', 'start-frame', 'end-frame');
  }

  renderer.setAnimationLoop(animate);

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);

  window.addEventListener('keydown', (event) => {
    // WHen press c, console.log camera position
    if (event.key === 'c') {
      console.log(camera.position);
    }
  })
}

const setupRenderer = (canvas: HTMLCanvasElement) => {
  const renderer = new THREE.WebGLRenderer({ 
    canvas,
    powerPreference: 'high-performance',
    antialias: false,
    depth: true,
    stencil: true,
    logarithmicDepthBuffer: true,
    precision: 'highp',
  });
  renderer.autoClear = false;
  renderer.autoClearStencil = false;
  renderer.setSize(window.innerWidth, window.innerHeight);
  return renderer;
}

const setupCamera = () => {
  const fowY = 60;
  const aspect = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 10_000;
  const camera = new THREE.PerspectiveCamera(fowY, aspect, near, far);

  camera.userData.halfSizeNearPlane = new THREE.Vector2(
    Math.tan(fowY) / 2.0 * aspect,
    Math.tan(fowY) / 2.0
  );

  camera.position.add({x: 400, y: 50, z: 400})

  camera.userData.previousViewMatrix = new THREE.Matrix4();

  return camera;
}

const setupControls = (camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => {
  const controls = new MapControls(camera, renderer.domElement);
  controls.target.set(500, 0, 500);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.1;
  controls.enableDamping = true;
  // controls.movementSpeed = 2;
  // controls.rollSpeed = 0.05;
  return controls;
}

const setupStats = () => {
  const stats = new Stats();
  stats.dom.style.position = 'absolute';
  stats.dom.style.top = "90vh";
  document.body.appendChild(stats.dom);
  return stats;
}
