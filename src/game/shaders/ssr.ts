import * as THREE from "three";
import { screenVS } from "./screenVS";

/**
 * Partially adapted from https://github.com/RoundedGlint585/ScreenSpaceReflection/blob/master/shaders/SSRFragment.glsl
 */
const ssrShaderFS1 = /* glsl */ `
precision highp float;

#define BINARYSEARCH
#define ADAPTIVE_STEP
#define EXPONENTIAL_STEP

#define RANDOM_SCALE vec4(443.897, 441.423, .0973, .1099)

uniform sampler2D previousFrame;
uniform sampler2D gNormalRoughness;
uniform sampler2D gPositionMetalness;
uniform mat4 projection;
uniform mat4 inverseProjection;
uniform vec2 u_resolution;

layout (location = 0) out vec4 FragColor;

vec3 random3(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * RANDOM_SCALE.xyz);
  p3 += dot(p3, p3.yxz + 19.19);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}

const int STEPS = 80;
const int STEPS2 = 80;

const float RAY_STEP = 0.1;
const float BIAS = 0.02;

vec2 vsToScreen(vec3 positionVS) {
  vec4 clipSpacePosition = projection * vec4(positionVS, 1.0);
  vec4 ndc = clipSpacePosition / clipSpacePosition.w;
  return (ndc.xy * 0.5 + 0.5);
}

vec4 SSR(vec3 positionVS, vec3 reflection) {
  vec3 iterStep = RAY_STEP * reflection;
  // Scale iterStep so it's always the same length in screen space
  iterStep /= length(reflection.xy);


  vec3 marchingPosition = positionVS + iterStep;
  float delta = 0.0;
  float depthFromScreen = 0.0;
  vec2 screenPosition = vec2(0.0);

  int i = 0;
  for (; i < STEPS; i++) {
    screenPosition = vsToScreen(marchingPosition);

    if (screenPosition.x < 0.0 || screenPosition.x > 1.0 || screenPosition.y < 0.0 || screenPosition.y > 1.0) {
      return vec4(0.0);
    }


    depthFromScreen = abs(texture(gPositionMetalness, screenPosition).z);
    delta = abs(marchingPosition.z) - depthFromScreen;

    if (abs(delta) < BIAS) {
      return vec4(screenPosition, distance(positionVS, marchingPosition), 1.0);
    }

    #ifdef BINARYSEARCH
    if (delta > 0.0) {
      break;
    }
    #endif

    #ifdef ADAPTIVE_STEP
      float directionSign = sign(abs(marchingPosition.z) - depthFromScreen);
      //this is sort of adapting step, should prevent lining reflection by doing sort of iterative converging
      //some implementation doing it by binary search, but I found this idea more cheaty and way easier to implement
      iterStep = iterStep * (1.0 - RAY_STEP * max(directionSign, 0.0));
      marchingPosition += iterStep * (-directionSign);
    #else
      marchingPosition += iterStep;
    #endif

    #ifdef EXPONENTIAL_STEP
      iterStep *= 1.05;
    #endif
  }

  #ifdef BINARYSEARCH
    for(; i < STEPS2; i++){
      iterStep *= 0.5;
      marchingPosition = marchingPosition - iterStep * sign(delta);
      
      screenPosition = vsToScreen(marchingPosition);
      depthFromScreen = abs(texture(gPositionMetalness, screenPosition).z);
      delta = abs(marchingPosition.z) - depthFromScreen;

      if (abs(delta) < BIAS) {
        return vec4(screenPosition, distance(positionVS, marchingPosition), 1.0);
      }
    }
  #endif

  return vec4(0.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 positionVS = texture(gPositionMetalness, uv).xyz;

  vec2 ndc = uv * 2.0 - 1.0;
  vec4 clipSpacePosition = vec4(ndc, 1.0, 1.0);
  vec4 viewSpacePos = inverseProjection * clipSpacePosition;
  viewSpacePos /= viewSpacePos.w; // Perspective divide
  vec3 viewDir = normalize(viewSpacePos.xyz);

  vec4 normalRoughness = texture(gNormalRoughness, uv);
  vec3 normalVS = normalize(normalRoughness.xyz);
  float roughness = normalRoughness.w;

  vec3 reflection = normalize(reflect(viewDir, normalVS));

  vec3 color = vec3(0.0);
  float hits = 0.0;
  float avgDist = 0.0;

  for (int i = 0; i < 5; i++) {
    vec3 jitter = 0.2 * roughness * roughness * (2.0 * random3(uv + float(i)).xyz - 1.0);
    vec3 sampleReflection = normalize(reflection + jitter);
    vec4 ssrResult = SSR(positionVS, sampleReflection);
    vec2 screenPos = ssrResult.xy;
    float dist = ssrResult.z;
    float hit = ssrResult.w;

    if (hit == 0.0) {
      continue;
    }
    vec3 hitColor = texture(previousFrame, screenPos).rgb;
    color += hitColor;
    hits += 1.0;
    avgDist += dist;
  }

  if (hits == 0.0) {
    FragColor = vec4(0.0);
    return;
  }

  color /= hits;
  
  avgDist /= hits;

  float contribution = max(1.0 - avgDist / 10.0, 0.0);
  color *= contribution;

  FragColor = vec4(color, hits/10.0);
}
`;

export const ssrShader = new THREE.RawShaderMaterial({
  vertexShader: screenVS,
  fragmentShader: ssrShaderFS1,
  side: THREE.FrontSide,
  glslVersion: "300 es",

  stencilWrite: true,
  stencilFunc: THREE.EqualStencilFunc,
  stencilZPass: THREE.KeepStencilOp,
  stencilFail: THREE.KeepStencilOp,
  stencilZFail: THREE.KeepStencilOp,
  stencilFuncMask: 0xff,
  stencilWriteMask: 0xff,
  stencilRef: 1,

  uniforms: {
    previousFrame: { value: null },
    gNormalRoughness: { value: null },
    gPositionMetalness: { value: null },
    u_resolution: { value: new THREE.Vector2() },
    projection: { value: new THREE.Matrix4() },
    inverseProjection: { value: new THREE.Matrix4() },
  },
});