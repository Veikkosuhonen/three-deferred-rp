import * as THREE from "three"
import { Pass } from "three/examples/jsm/Addons.js";

export type PassProps = {
  renderer: THREE.WebGLRenderer,
  read: THREE.WebGLRenderTarget,
  write: THREE.WebGLRenderTarget
}

export abstract class RenderPass extends Pass {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  abstract pass({ renderer, read, write }: PassProps): void

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, deltaTime: number, maskActive: boolean): void {
    const markName = `start-${this.name}`
    const measureName = `pass-${this.name}`

    performance.clearMarks(markName)
    performance.mark(markName)

    this.pass({
      renderer,
      read: readBuffer,
      write: writeBuffer
    })

    performance.clearMeasures(measureName)
    performance.measure(measureName, markName)
  }
}