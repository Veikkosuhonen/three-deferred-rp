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
import { Profiler } from './profiler';
import { setupUI } from './ui';
import player, { getTimeLineTrack, makeMatrixAnim, makeVectorAnim, setLookAtFromAnims, setMatrixFromAnim, timeline, timelineValues } from '../timeline';
import { buildingMaterial } from './materials/building';

export const loadingManager = new THREE.LoadingManager();
export let onLoaded: () => void;

export const start = async (canvas: HTMLCanvasElement) => {
  // studio.initialize();
  const project = getProject("demo project", { state: theatreProject });
  const sheet = project.sheet("demo sheet");

  const renderer = setupRenderer(canvas);
  const camera = setupCamera();
  const game = new Game(renderer, camera, sheet, loadingManager);

  const cameraPAnim = makeVectorAnim(getTimeLineTrack("position"));
  const cameraTAnim = makeVectorAnim(getTimeLineTrack("target"));

  setupScene(game)
  setupUI(game)

  const stats = setupStats();

  // const debugLines = createLines();
  const clock = new THREE.Clock();
  const controls = setupControls(game.mainCamera, renderer);

  const pipeline = await setupPipeline(game)

  let controlled = false;
  // addEventListener('keydown', (event) => {
  //   if (event.key === 'e') {
  //     controlled = !controlled
  //     if (controlled) {
  //       const t = cameraTAnim.getValuesAt(player.currentTime)
  //       controls.target.set(t.x, t.y, t.z)
  //     }
  //   }
  // })
  let once = true;
  const animate = () => {
    if (player.paused && once) {
      player.seek(0)
      player.play()
      once = false;
    }
    // stats.begin();

    if (controlled) {
      controls.update(clock.getDelta())
    } else {
      setLookAtFromAnims(cameraPAnim, cameraTAnim, game.mainCamera);
    }

    game.onRender();
    pipeline.render();
    // debugLines.updateFromBuffer(game.world.debugRender())
    // renderer.render(debugLines.lines, game.mainCamera);
    game.mainCamera.userData.previousViewMatrix.copy(game.mainCamera.matrixWorldInverse);
    // stats.end();
  }

  // play audio (./music.mp3)
  const audio = new Audio('./sieni.mp3');
  audio.loop = false;
  audio.volume = 1.0;
  audio.play().catch(err => {
    console.error("Failed to play audio:", err);
  });
  player.addEventListener("seek", (p) => {
    console.log(p)
    audio.currentTime = player.currentTime;
  })

  setInterval(() => {
    game.update(1 / 20);
  }, 1 / 20)

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
      const str = `{\ntime: ${player.currentTime},\nposition: v3([${camera.position.x},${camera.position.y},${camera.position.z},]),\ntarget: v3([${controls.target.x},${controls.target.y},${controls.target.z},]) \n}`;
      // console.log(str);
      navigator.clipboard.writeText(str).then(() => {
        console.log("Copied to clipboard:", str);
      })
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

  camera.position.add(timelineValues.START_POS);

  camera.userData.previousViewMatrix = new THREE.Matrix4();

  return camera;
}

const setupControls = (camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => {
  const controls = new MapControls(camera, renderer.domElement);
  controls.target.copy(timelineValues.START_TARGET)
  // controls.autoRotate = true;
  // controls.autoRotateSpeed = 0.1;
  controls.enableDamping = true;
  // controls.movementSpeed = 2;
  // controls.rollSpeed = 0.05;
  return controls;
}

const setupStats = () => {
  const stats = new Stats();
  stats.dom.style.position = 'absolute';
  stats.dom.style.top = "90vh";
  // document.body.appendChild(stats.dom);
  return stats;
}
