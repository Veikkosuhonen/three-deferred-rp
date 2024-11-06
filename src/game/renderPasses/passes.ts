import * as THREE from "three";
import { FullScreenQuad } from "three/examples/jsm/Addons.js";
import { lightningShader, blur4xShader, ssaoShader, finalShader } from "../shaders";
import { skyShader } from "../shaders/sky";
import { thresholdShader } from "../shaders/threshold";
import { copyShader } from "../shaders/copy";
import { bloomMixShader, downsampleShader, upsampleShader } from "../shaders/bloom";
import { RenderPass } from "./RenderPass";

const fsQuad = new FullScreenQuad();

export class GBufferPass extends RenderPass {
  scene: THREE.Scene;
  camera: THREE.Camera;
  gBuffer: THREE.WebGLRenderTarget;

  constructor(scene: THREE.Scene, camera: THREE.Camera, gBuffer: THREE.WebGLRenderTarget) {
    super("GBufferPass");
		this.scene = scene;
		this.camera = camera;
    this.gBuffer = gBuffer;
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, _readBuffer: THREE.WebGLRenderTarget) {
    renderer.setRenderTarget(this.gBuffer);
    renderer.clear(true, true, true);

    renderer.render(this.scene, this.camera);
  }
}

export class SSAOPass extends RenderPass {
  gBuffer: THREE.WebGLRenderTarget;
  ssaoBuffer: THREE.WebGLRenderTarget;
  ssaoBuffer2: THREE.WebGLRenderTarget;
  camera: THREE.Camera;
  noiseTexture: THREE.DataTexture;
  ssaoKernel: Float32Array;
  KERNEL_SIZE = 32;
  SCALE = 1;

  constructor(gBuffer: THREE.WebGLRenderTarget, camera: THREE.Camera) {
    super("SSAOPass");
    this.gBuffer = gBuffer;
    this.ssaoBuffer = new THREE.WebGLRenderTarget(window.innerWidth * this.SCALE, window.innerHeight * this.SCALE, {
      format: THREE.RedFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    this.ssaoBuffer2 = new THREE.WebGLRenderTarget(window.innerWidth * this.SCALE, window.innerHeight * this.SCALE, {
      format: THREE.RedFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });

    this.camera = camera;

    this.noiseTexture = new THREE.DataTexture(
      new Float32Array(12 * 12 * 4), 12, 12,
      THREE.RGBAFormat, THREE.FloatType, 
      THREE.Texture.DEFAULT_MAPPING, 
      THREE.RepeatWrapping, 
      THREE.RepeatWrapping, 
      THREE.NearestFilter,
      THREE.NearestFilter
    );
    // Fill noise texture with random values
    for (let i = 0; i < 12 * 12; i++) {
      this.noiseTexture.image.data[4 * i    ] = Math.random() * 2 - 1;
      this.noiseTexture.image.data[4 * i + 1] = Math.random() * 2 - 1;
      this.noiseTexture.image.data[4 * i + 2] = 0;
      this.noiseTexture.image.data[4 * i + 3] = 0;
    }

    this.noiseTexture.needsUpdate = true;

    // Fill ssao kernel with random values
    this.ssaoKernel = new Float32Array(this.KERNEL_SIZE * 3);

    for (let i = 0; i < this.KERNEL_SIZE; i++) {
      const sample = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random()
      );
      sample.normalize();
      sample.multiplyScalar(Math.random());
      let scale = i / this.KERNEL_SIZE;
      scale = 0.1 + scale * scale * (1 - 0.1); // lerp(0.1f, 1.0f, scale * scale);
      sample.multiplyScalar(scale);
      this.ssaoKernel[i * 3    ] = sample.x;
      this.ssaoKernel[i * 3 + 1] = sample.y;
      this.ssaoKernel[i * 3 + 2] = sample.z;
    }

    ssaoShader.uniforms.gColorAo.value = this.gBuffer.textures[0];
    ssaoShader.uniforms.gNormalRoughness.value = this.gBuffer.textures[1];
    ssaoShader.uniforms.gPositionMetalness.value = this.gBuffer.textures[2];
    ssaoShader.uniforms.noiseTexture.value = this.noiseTexture;
    ssaoShader.uniforms.ssaoKernel.value = this.ssaoKernel;
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, _readBuffer: THREE.WebGLRenderTarget): void {
    renderer.setRenderTarget(this.ssaoBuffer2);
    ssaoShader.uniforms.u_resolution.value.set(window.innerWidth * this.SCALE, window.innerHeight * this.SCALE);
    ssaoShader.uniforms.projection.value.copy(this.camera.projectionMatrix);
    fsQuad.material = ssaoShader;
    fsQuad.render(renderer);

    renderer.setRenderTarget(this.ssaoBuffer);
    blur4xShader.uniforms.u_resolution.value.set(window.innerWidth * this.SCALE, window.innerHeight * this.SCALE);
    blur4xShader.uniforms.inputTexture.value = this.ssaoBuffer2.texture;
    fsQuad.material = blur4xShader;
    fsQuad.render(renderer);
  }
}

export class LightVolumePass extends RenderPass {
  scene: THREE.Scene;
  camera: THREE.Camera;
  gBuffer: THREE.WebGLRenderTarget;
  lightVolume: THREE.Mesh;

  constructor(scene: THREE.Scene, camera: THREE.Camera, gBuffer: THREE.WebGLRenderTarget) {
    super("LightVolumePass");
    this.scene = scene;
    this.camera = camera;
    this.gBuffer = gBuffer;
  
    this.lightVolume = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
    );

    lightningShader.uniforms.gColorAo.value = this.gBuffer.textures[0];
    lightningShader.uniforms.gNormalRoughness.value = this.gBuffer.textures[1];
    lightningShader.uniforms.gPositionMetalness.value = this.gBuffer.textures[2];
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, _readBuffer: THREE.WebGLRenderTarget) {
    renderer.setRenderTarget(writeBuffer);
    renderer.clear(true, true, false);

    lightningShader.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    lightningShader.uniforms.u_camPos.value.copy(this.camera.position);
    lightningShader.uniforms.modelViewMatrix.value.copy(this.camera.modelViewMatrix);
    lightningShader.uniforms.projectionMatrix.value.copy(this.camera.projectionMatrix);
    
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.PointLight)) return;

      lightningShader.uniforms.lightColor.value.copy(obj.color);
      lightningShader.uniforms.lightColor.value.multiplyScalar(obj.intensity);
      const positionVS = obj.position.clone().applyMatrix4(this.camera.matrixWorldInverse);
      lightningShader.uniforms.lightPositionVS.value.copy(positionVS);

      this.lightVolume.position.copy(obj.position);
      this.lightVolume.scale.set(obj.distance, obj.distance, obj.distance);
      this.lightVolume.updateMatrix();
    
      lightningShader.uniformsNeedUpdate = true;
      this.lightVolume.material = lightningShader;

      renderer.render(this.lightVolume, this.camera);
    });
  }
}

export class FinalLightPass extends RenderPass {
  scene: THREE.Scene;
  camera: THREE.Camera;
  gBuffer: THREE.WebGLRenderTarget;
  constantAmbientLight: THREE.Color;
  irradianceIntensity: number;

  constructor(scene: THREE.Scene, camera: THREE.Camera, 
    gBuffer: THREE.WebGLRenderTarget, 
    ssaoTexture: THREE.Texture, 
    irradianceMap: THREE.Texture
  ) {
    super("FinalLightPass");
    this.scene = scene;
    this.camera = camera;
    this.gBuffer = gBuffer;
    this.constantAmbientLight = new THREE.Color(0, 0, 0);
    this.irradianceIntensity = 1.0;
  
    finalShader.uniforms.gColorAo.value = this.gBuffer.textures[0];
    finalShader.uniforms.gNormalRoughness.value = this.gBuffer.textures[1];
    finalShader.uniforms.gPositionMetalness.value = this.gBuffer.textures[2];
    finalShader.uniforms.ssaoTexture.value = ssaoTexture;
    finalShader.uniforms.gEmission.value = this.gBuffer.textures[3];
    finalShader.uniforms.irradianceMap.value = irradianceMap;
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    renderer.setRenderTarget(writeBuffer);
    renderer.clear(true, true, false);

    finalShader.uniforms.lightningTexture.value = readBuffer.texture;
    finalShader.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    finalShader.uniforms.inverseViewMatrix.value.copy(this.camera.matrixWorld);

    finalShader.uniforms.u_constantAmbientLight.value.copy(this.constantAmbientLight);
    finalShader.uniforms.u_irradianceIntensity.value = this.irradianceIntensity

    fsQuad.material = finalShader;
    fsQuad.render(renderer);
  }
}

export class SkyPass extends RenderPass {
  camera: THREE.Camera;
  exposure: number;
  gamma: number;

  constructor(
    envMap: THREE.CubeTexture,
    camera: THREE.PerspectiveCamera
  ) {
    super("SkyPass");
    this.needsSwap = false;
    skyShader.uniforms.envMap.value = envMap;
    this.camera = camera;
    this.exposure = 0.1;
    this.gamma = 2.2;
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {    
    renderer.setRenderTarget(readBuffer);
    
    skyShader.uniforms.inverseProjection.value.copy(this.camera.projectionMatrixInverse);
    skyShader.uniforms.inverseViewMatrix.value.copy(this.camera.matrixWorld);
    skyShader.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    skyShader.uniforms.exposure.value = this.exposure;
    skyShader.uniforms.gamma.value = this.gamma;
  
    fsQuad.material = skyShader;
    fsQuad.render(renderer);
  }
}

export class BloomPass extends RenderPass {
  colorBuffers: THREE.WebGLRenderTarget[];
  bloomStrength;
  filterRadius;

  constructor(bloomStrength: number, filterRadius: number) {
    super("BloomPass");
    this.bloomStrength = bloomStrength;
    this.filterRadius = filterRadius;
    this.colorBuffers = [];

    let w = window.innerWidth;
    let h = window.innerHeight;

    const downscale = 5;

    for (let i = 0; i < downscale; i++) {
      w = Math.max(1, w / 2);
      h = Math.max(1, h / 2);
      this.colorBuffers.push(new THREE.WebGLRenderTarget(w, h, {
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      }));
    }
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    // Write bright color to first buffer
    renderer.setRenderTarget(this.colorBuffers[0]);

    // Downsample
    fsQuad.material = downsampleShader;
    downsampleShader.uniforms.src.value = readBuffer.texture;
    downsampleShader.uniforms.u_resolution.value.set(this.colorBuffers[0].width, this.colorBuffers[0].height);
    fsQuad.render(renderer);

    for (let destIdx = 1; destIdx < this.colorBuffers.length; destIdx++) {
      const srcIdx = destIdx - 1;
      renderer.setRenderTarget(this.colorBuffers[destIdx]);
      downsampleShader.uniforms.src.value = this.colorBuffers[srcIdx].texture;
      downsampleShader.uniforms.u_resolution.value.set(this.colorBuffers[destIdx].width, this.colorBuffers[destIdx].height);
      fsQuad.render(renderer);
    }

    // Upsample. Additively blend.
    fsQuad.material = upsampleShader;
    upsampleShader.uniforms.filterRadius.value = this.filterRadius;
    for (let i = this.colorBuffers.length - 2; i >= 0; i--) {
      renderer.setRenderTarget(this.colorBuffers[i]);
      upsampleShader.uniforms.src.value = this.colorBuffers[i + 1].texture;
      upsampleShader.uniforms.u_resolution.value.set(this.colorBuffers[i].width, this.colorBuffers[i].height);
      fsQuad.render(renderer);
    }

    fsQuad.material = bloomMixShader;
    renderer.setRenderTarget(writeBuffer);
    bloomMixShader.uniforms.src.value = readBuffer.texture;
    bloomMixShader.uniforms.bloom.value = this.colorBuffers[0].texture;
    bloomMixShader.uniforms.u_resolution.value.set(writeBuffer.width, writeBuffer.height);
    bloomMixShader.uniforms.bloomStrength.value = this.bloomStrength;
    fsQuad.render(renderer);
  }
}