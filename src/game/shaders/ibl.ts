import * as THREE from "three";
import { screenVS } from "./screenVS";
import { cubeUVDefines, pmrem } from "./lib/pmrem";

const iblShaderFS = /* glsl */ `
precision highp float;

uniform sampler2D gColorAo;
uniform sampler2D gNormalRoughness;
uniform sampler2D gPositionMetalness;
uniform sampler2D ssaoTexture;
uniform sampler2D gEmission;
uniform samplerCube irradianceMap;
uniform sampler2D prefilterMap;
uniform sampler2D brdfLUT;

uniform vec2 u_resolution;
uniform vec3 u_constantAmbientLight;
uniform float u_irradianceIntensity;
uniform float exposure;
uniform float gamma;
uniform mat4 inverseViewMatrix;

layout (location = 0) out vec4 diffuseColorOut;
layout (location = 1) out vec4 specularColorOut;

${pmrem}

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
  return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

vec3 gammaExposureCorrect(in vec3 inputColor) {
  vec3 color = pow(inputColor, vec3(1.0 / gamma));
  color = 1.0 - exp(-color * exposure);
  return color;
}


void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 albedo = texture(gColorAo, uv).rgb;
  vec4 normalRoughness = texture(gNormalRoughness, uv);
  vec4 positionMetalness = texture(gPositionMetalness, uv);
  float metalness = positionMetalness.w;
  float roughness = normalRoughness.w;

  vec4 ssao = texture(ssaoTexture, uv);
  vec4 emission = texture(gEmission, uv);

  vec3 position = positionMetalness.xyz;
  vec3 V = normalize(-position);
  vec3 N = normalize(normalRoughness.xyz);
  vec3 R = reflect(-V, N);
  float NdotV = max(dot(N, V), 0.0);

  // Cook-Torrance BRDF
  vec3 F0 = vec3(0.04);
  F0 = mix(F0, albedo, metalness);

  vec3 kS = fresnelSchlickRoughness(NdotV, F0, roughness);
  vec3 kD = 1.0 - kS;
  kD *= 1.0 - metalness;

  vec3 normalWS = (inverseViewMatrix * vec4(N, 0.0)).xyz;
  vec3 irradiance = texture(irradianceMap, normalWS).rgb * u_irradianceIntensity;

  vec3 reflectionWS = (inverseViewMatrix * vec4(R, 0.0)).xyz;
  vec3 reflectionColor = gammaExposureCorrect(
      textureCubeUV(prefilterMap, reflectionWS, roughness).rgb
  );
  vec2 envBRDF = texture(brdfLUT, vec2(NdotV, roughness)).rg;
  vec3 specular = reflectionColor * (kS * envBRDF.x + envBRDF.y);

  vec3 diffuse = kD * (albedo * irradiance) + u_constantAmbientLight;
  vec3 diffuseColor = diffuse * ssao.r + emission.rgb;
  vec3 specularColor = specular * ssao.r;

  diffuseColorOut = vec4(diffuseColor, 1.0);
  specularColorOut = vec4(specularColor, 1.0);
}
`;

export const iblShader = new THREE.RawShaderMaterial({
  vertexShader: screenVS,
  fragmentShader: iblShaderFS,
  side: THREE.FrontSide,
  glslVersion: "300 es",
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false,
  depthTest: false,

  stencilWrite: true,
  stencilFunc: THREE.EqualStencilFunc,
  stencilZPass: THREE.KeepStencilOp,
  stencilFail: THREE.KeepStencilOp,
  stencilZFail: THREE.KeepStencilOp,
  stencilFuncMask: 0xff,
  stencilWriteMask: 0xff,
  stencilRef: 1,

  uniforms: {
    gColorAo: { value: null },
    gNormalRoughness: { value: null },
    gPositionMetalness: { value: null },
    ssaoTexture: { value: null },
    envTexture: { value: null },
    gEmission: { value: null },
    irradianceMap: { value: null },
    prefilterMap: { value: null },
    brdfLUT: { value: null },
    inverseViewMatrix: { value: new THREE.Matrix4() },
    u_constantAmbientLight: { value: new THREE.Color() },
    u_resolution: { value: new THREE.Vector2() },
    u_irradianceIntensity: { value: 1.0 },
    exposure: { value: 1.0 },
    gamma: { value: 2.2 },
  },
});
