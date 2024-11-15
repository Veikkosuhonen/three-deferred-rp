import * as THREE from "three";
import { FullScreenQuad } from "three/examples/jsm/Addons.js";
import { lightningShader, blur4xShader, ssaoShader, finalShader } from "../shaders";
import { skyShader } from "../shaders/sky";
import { thresholdShader } from "../shaders/threshold";
import { copyShader } from "../shaders/copy";
import { bloomMixShader, downsampleShader, upsampleShader } from "../shaders/bloom";
import { RenderPass } from "./RenderPass";
import { ssrShader } from "../shaders/ssr";

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
    blur4xShader.uniforms.src.value = this.ssaoBuffer2.texture;
    fsQuad.material = blur4xShader;
    fsQuad.render(renderer);
  }
}

export class SSRPass extends RenderPass {
  gBuffer: THREE.WebGLRenderTarget;
  ssrBuffer: THREE.WebGLRenderTarget;
  blurBuffer: THREE.WebGLRenderTarget;
  camera: THREE.Camera;

  constructor(gBuffer: THREE.WebGLRenderTarget, camera: THREE.Camera, previousFrameBuffer: THREE.WebGLRenderTarget) {
    super("SSRPass");
    this.gBuffer = gBuffer;
    this.ssrBuffer = new THREE.WebGLRenderTarget(window.innerWidth/2, window.innerHeight/2, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    this.blurBuffer = new THREE.WebGLRenderTarget(window.innerWidth/4, window.innerHeight/4, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    this.camera = camera;
    
    ssrShader.uniforms.previousFrame.value = previousFrameBuffer.texture;
    ssrShader.uniforms.gNormalRoughness.value = this.gBuffer.textures[1];
    ssrShader.uniforms.gPositionMetalness.value = this.gBuffer.textures[2];
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, _readBuffer: THREE.WebGLRenderTarget): void {
    renderer.setRenderTarget(this.ssrBuffer);
    renderer.clear(true, true, false);
    ssrShader.uniforms.u_resolution.value.set(this.ssrBuffer.width, this.ssrBuffer.height);
    ssrShader.uniforms.projection.value.copy(this.camera.projectionMatrix);
    ssrShader.uniforms.inverseProjection.value.copy(this.camera.projectionMatrixInverse);
    fsQuad.material = ssrShader;
    fsQuad.render(renderer);

    renderer.setRenderTarget(this.blurBuffer);
    blur4xShader.uniforms.src.value = this.ssrBuffer.texture;
    blur4xShader.uniforms.u_resolution.value.set(this.blurBuffer.width, this.blurBuffer.height);
    fsQuad.material = blur4xShader;
    fsQuad.render(renderer);

    renderer.setRenderTarget(this.ssrBuffer);
    renderer.clear();
    blur4xShader.uniforms.src.value = this.blurBuffer.texture;
    blur4xShader.uniforms.u_resolution.value.set(this.ssrBuffer.width, this.ssrBuffer.height);
    fsQuad.material = blur4xShader;
    fsQuad.render(renderer);
  }
}

export class SavePass extends RenderPass {
  buffer: THREE.WebGLRenderTarget;

  constructor(width: number, height: number) {
    super("SavePass");
    this.needsSwap = false;
    this.buffer = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
  }

  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    renderer.setRenderTarget(this.buffer);
    renderer.clear();
    copyShader.uniforms.inputTexture.value = readBuffer.texture;
    copyShader.uniforms.u_resolution.value.set(this.buffer.width, this.buffer.height);
    fsQuad.material = copyShader;
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
  constantAmbientLight: THREE.Color = new THREE.Color(0.1, 0.1, 0.1);
  irradianceIntensity: number = 1.0;
  iblGamma: number = 2.2;
  iblExposure: number = 1.0;

  constructor(scene: THREE.Scene, camera: THREE.Camera, 
    gBuffer: THREE.WebGLRenderTarget, 
    ssaoTexture: THREE.Texture, 
    irradianceMap: THREE.Texture,
    prefilteredMap: THREE.Texture,
    brdfLUT: THREE.Texture,
    ssrTexture: THREE.Texture,
  ) {
    super("FinalLightPass");
    this.scene = scene;
    this.camera = camera;
    this.gBuffer = gBuffer;
  
    finalShader.uniforms.gColorAo.value = this.gBuffer.textures[0];
    finalShader.uniforms.gNormalRoughness.value = this.gBuffer.textures[1];
    finalShader.uniforms.gPositionMetalness.value = this.gBuffer.textures[2];
    finalShader.uniforms.ssaoTexture.value = ssaoTexture;
    finalShader.uniforms.gEmission.value = this.gBuffer.textures[3];
    finalShader.uniforms.irradianceMap.value = irradianceMap;
    finalShader.uniforms.prefilterMap.value = prefilteredMap;
    finalShader.uniforms.brdfLUT.value = brdfLUT;
    finalShader.uniforms.ssrTexture.value = ssrTexture;
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    renderer.setRenderTarget(writeBuffer);
    renderer.clear(true, true, false);

    finalShader.uniforms.lightningTexture.value = readBuffer.texture;
    finalShader.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    finalShader.uniforms.inverseViewMatrix.value.copy(this.camera.matrixWorld);

    finalShader.uniforms.u_constantAmbientLight.value.copy(this.constantAmbientLight);
    finalShader.uniforms.u_irradianceIntensity.value = this.irradianceIntensity
    finalShader.uniforms.exposure.value = this.iblExposure;
    finalShader.uniforms.gamma.value = this.iblGamma;

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
  blurChain: THREE.WebGLRenderTarget[];
  bloomStrength;
  filterRadius;

  constructor(bloomStrength: number, filterRadius: number) {
    super("BloomPass");
    this.bloomStrength = bloomStrength;
    this.filterRadius = filterRadius;
    this.blurChain = [];

    let w = window.innerWidth;
    let h = window.innerHeight;

    const downscale = 5;

    for (let i = 0; i < downscale; i++) {
      w = Math.max(1, w / 2);
      h = Math.max(1, h / 2);

      const rt = new THREE.WebGLRenderTarget(w, h, {
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });

      this.blurChain.push(rt);
    }
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    renderer.setRenderTarget(this.blurChain[0]);
    renderer.clear();
  
    // Downsample
    fsQuad.material = downsampleShader;
    downsampleShader.uniforms.src.value = readBuffer.texture;
    downsampleShader.uniforms.u_resolution.value.set(this.blurChain[0].width, this.blurChain[0].height);
    fsQuad.render(renderer);

    for (let destIdx = 1; destIdx < this.blurChain.length; destIdx++) {
      const srcIdx = destIdx - 1;
      renderer.setRenderTarget(this.blurChain[destIdx]);
      renderer.clear();
      downsampleShader.uniforms.src.value = this.blurChain[srcIdx].texture;
      downsampleShader.uniforms.u_resolution.value.set(this.blurChain[destIdx].width, this.blurChain[destIdx].height);
      fsQuad.render(renderer);
    }

    // Upsample. Additively blend.
    fsQuad.material = upsampleShader;
    upsampleShader.uniforms.filterRadius.value = this.filterRadius;
    for (let i = this.blurChain.length - 2; i >= 0; i--) {
      renderer.setRenderTarget(this.blurChain[i]);
      renderer.clear();
      upsampleShader.uniforms.src.value = this.blurChain[i + 1].texture;
      upsampleShader.uniforms.u_resolution.value.set(this.blurChain[i].width, this.blurChain[i].height);
      fsQuad.render(renderer);
    }

    fsQuad.material = bloomMixShader;
    renderer.setRenderTarget(writeBuffer);
    bloomMixShader.uniforms.src.value = readBuffer.texture;
    bloomMixShader.uniforms.bloom.value = this.blurChain[0].texture;
    bloomMixShader.uniforms.u_resolution.value.set(writeBuffer.width, writeBuffer.height);
    bloomMixShader.uniforms.bloomStrength.value = this.bloomStrength;
    fsQuad.render(renderer);
  }
}

export class DebugPass extends RenderPass {
  texture: THREE.Texture;

  constructor(texture: THREE.Texture) {
    super("DebugPass");
    this.texture = texture;
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, deltaTime: number, maskActive: boolean): void {
    renderer.setRenderTarget(writeBuffer);
    renderer.clear(true, true, true);
    copyShader.uniforms.inputTexture.value = this.texture;
    copyShader.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    fsQuad.material = copyShader;
    fsQuad.render(renderer);
  }
}