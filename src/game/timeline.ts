import * as THREE from "three";
import { TimelinePlayer, PFAnimation } from "../libs/parameter-flow/src";

export const timeline = {
  START_POS: new THREE.Vector3(100, 100, 100),
  START_TARGET: new THREE.Vector3(200, 0, 200),
  END_POS: new THREE.Vector3(900, 400, 1500),
  END_TARGET: new THREE.Vector3(500, 0, 400),
}

const player = new TimelinePlayer({
  duration: 10,
  bpm: 120,
  // Length of the timeline in seconds

  // Defaults to true. Set to false if you want to handle keyboard input yourself
  keyboardListener: true,
});

export const makeVectorAnim = (frames: THREE.Vector3[], times: number[]) => {
  const keys = ["x", "y", "z"] as const;
  const anim = new PFAnimation(Object.fromEntries(
    keys.map((k) => 
      [
        k,
        frames.map((frame, j) => ({ time: times[j], value: frame[k] })),
      ]
    )),
  )
  return anim
}

export const makeMatrixAnim = (frames: THREE.Matrix4[], times: number[]) => {
  const elements = frames[0].elements;
  const anim = new PFAnimation(Object.fromEntries(
    elements.map((_, i) => 
      [
        `m${i}`,
        frames.map((frame, j) => (
          { time: times[j], value: frame.elements[i] }
        )),
      ]
    )),
  )
  return anim
}

export const setLookAtFromAnims = (positionAnim: PFAnimation, targetAnim: PFAnimation, camera: THREE.PerspectiveCamera) => {
  const p = positionAnim.getValuesAt(player.currentTime);
  const t = targetAnim.getValuesAt(player.currentTime);

  camera.position.set(p.x, p.y, p.z);
  camera.lookAt(t.x, t.y, t.z);
}

export default player;
