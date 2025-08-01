import * as THREE from "three";
import { PassProps, RenderPass } from "./RenderPass";
import { gBufferShaderVariants } from "../shaders/gbuffer";
import { bgCube } from "./utils";
import { skyGBufferShader } from "../shaders/skyGBuffer";
import player, { getFloat, getTimeLineTrack, makeFloatAnim } from "../../timeline";
import { PFAnimation } from "~/libs/parameter-flow/src";

export class TextPass extends RenderPass {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  textBuffer: THREE.WebGLRenderTarget;
  flickerAnim: PFAnimation

  constructor(scene: THREE.Scene, camera: THREE.OrthographicCamera, textBuffer: THREE.WebGLRenderTarget) {
    super("GBufferPass");
    this.scene = scene;
    this.camera = camera;
    this.textBuffer = textBuffer;
    const track = getTimeLineTrack("bgFlicker");
    const anim = makeFloatAnim(track);
    this.flickerAnim = anim
  }

  pass({ renderer }: PassProps) {
    renderer.setRenderTarget(this.textBuffer);
    
    const clearColor = getFloat(this.flickerAnim)
    renderer.setClearColor(clearColor, 1.0);
    renderer.clear(true, true, true);
    renderer.setClearColor(0x000000, 1.0);

    renderer.render(this.scene, this.camera);
  }
}
