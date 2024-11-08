import * as THREE from "three";
import { screenVS } from "./screenVS";
import { cubeUVDefines, pmrem } from "./lib/pmrem";

const finalShaderFS = /* glsl */ `
precision highp float;

uniform sampler2D gColorAo;
uniform sampler2D gNormalRoughness;
uniform sampler2D gPositionMetalness;
uniform sampler2D lightningTexture;
uniform sampler2D ssaoTexture;
uniform sampler2D gEmission;
uniform samplerCube irradianceMap;

uniform vec2 u_resolution;
uniform vec3 u_constantAmbientLight;
uniform float u_irradianceIntensity;
uniform mat4 inverseViewMatrix;

out vec4 fragColor;

${pmrem}

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
  return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 albedo = texture(gColorAo, uv).rgb;
  vec3 color = texture(lightningTexture, uv).rgb;
  vec4 normalRoughness = texture(gNormalRoughness, uv);
  vec4 positionMetalness = texture(gPositionMetalness, uv);
  float metalness = positionMetalness.w;
  float roughness = normalRoughness.w;
  vec3 normalWS = (inverseViewMatrix * vec4(normalRoughness.xyz, 0.0)).xyz;
  vec3 irradiance = texture(irradianceMap, normalWS).rgb * u_irradianceIntensity;
  vec4 ssao = texture(ssaoTexture, uv);
  vec4 emission = texture(gEmission, uv);

  vec3 position = positionMetalness.xyz;
  vec3 V = normalize(-position);
  vec3 N = normalize(normalRoughness.xyz);

  // Cook-Torrance BRDF
  vec3 F0 = vec3(0.04);

  vec3 kS = fresnelSchlickRoughness(max(dot(N, V), 0.0), F0, roughness);
  vec3 kD = 1.0 - kS;
  vec3 diffuse = albedo * irradiance;
  vec3 ambient    = (kD * diffuse + u_constantAmbientLight) * ssao.r;

  vec3 outColor = color + ambient + emission.rgb;

  fragColor = vec4(outColor, 1.0);
}
`;

export const finalShader = new THREE.RawShaderMaterial({
  vertexShader: screenVS,
  fragmentShader: finalShaderFS,
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
    gColorAo: { value: null },
    gNormalRoughness: { value: null },
    gPositionMetalness: { value: null },
    lightningTexture: { value: null },
    ssaoTexture: { value: null },
    envTexture: { value: null },
    gEmission: { value: null },
    irradianceMap: { value: null },
    inverseViewMatrix: { value: new THREE.Matrix4() },
    u_constantAmbientLight: { value: new THREE.Color() },
    u_resolution: { value: new THREE.Vector2() },
    u_irradianceIntensity: { value: 1.0 },
  },
});
