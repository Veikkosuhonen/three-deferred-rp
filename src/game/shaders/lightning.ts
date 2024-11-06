import * as THREE from "three";

const lightningShaderVS = /* glsl */ `
precision highp float;

in vec3 position;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const lightningShaderFS = /* glsl */ `
precision highp float;

const float PI = 3.14159265359;

uniform vec2 u_resolution;
uniform vec3 u_camPos;

uniform sampler2D gColorAo;
uniform sampler2D gNormalRoughness;
uniform sampler2D gPositionMetalness;

out vec4 fragColor;

uniform vec3 lightColor;
uniform vec3 lightPositionVS;

float DistributionGGX(vec3 N, vec3 H, float roughness) {
  float a      = roughness*roughness;
  float a2     = a*a;
  float NdotH  = max(dot(N, H), 0.0);
  float NdotH2 = NdotH*NdotH;

  float num   = a2;
  float denom = (NdotH2 * (a2 - 1.0) + 1.0);
  denom = PI * denom * denom;

  return num / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness) {
  float r = (roughness + 1.0);
  float k = (r*r) / 8.0;

  float num   = NdotV;
  float denom = NdotV * (1.0 - k) + k;

  return num / denom;
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
  float NdotV = max(dot(N, V), 0.0);
  float NdotL = max(dot(N, L), 0.0);
  float ggx2  = GeometrySchlickGGX(NdotV, roughness);
  float ggx1  = GeometrySchlickGGX(NdotL, roughness);

  return ggx1 * ggx2;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 colorAo = texture(gColorAo, uv);
  vec4 normalRoughness = texture(gNormalRoughness, uv);
  vec4 positionMetalness = texture(gPositionMetalness, uv);

  vec3 albedo = colorAo.rgb;
  vec3 normal = normalRoughness.rgb;
  float roughness = normalRoughness.a;
  vec3 position = positionMetalness.rgb;
  float metalness = positionMetalness.a;

  vec3 N = normalize(normal); // Normal
  vec3 V = normalize(-position); // View direction

  vec3 Lo = vec3(0.0); // Outgoing reflectance
  vec3 L = normalize(lightPositionVS - position); // Light direction
  vec3 H = normalize(L + V); // Half vector
  float NDF = DistributionGGX(N, H, roughness); // Normal distribution function
  float G   = GeometrySmith(N, V, L, roughness); // Geometry function

  // Cook-Torrance BRDF
  vec3 F0 = vec3(0.04);
  F0 = mix(F0, albedo, metalness);
  vec3 F = F0 + (1.0 - F0) * pow(clamp(1.0 - max(dot(H, V), 0.0), 0.0, 1.0), 5.0);
  
  float ndotl = max(dot(N, L), 0.0);

  vec3 numerator    = NDF * G * F;
  float denominator = 4.0 * max(dot(N, V), 0.0) * ndotl + 0.0001;
  vec3 specular     = numerator / denominator; 

  float dist = length(lightPositionVS - position);
  float attenuation = 1.0 / (1.0 + dist * dist);
  vec3 radiance = lightColor * attenuation;

  vec3 kS = F; // Specular contribution, aka energy of reflection
  vec3 kD = vec3(1.0) - kS; // Diffuse contribution
  kD *= 1.0 - metalness;

  Lo += (kD * albedo / PI + specular) * radiance * ndotl;

  vec3 color   = Lo;

  fragColor = vec4(color, 1.0);
}
`;

export const lightningShader = new THREE.RawShaderMaterial({
  vertexShader: lightningShaderVS,
  fragmentShader: lightningShaderFS,
  side: THREE.BackSide,
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
    u_resolution: { value: new THREE.Vector2() },
    u_camPos: { value: new THREE.Vector3() },
    lightPositionVS: { value: new THREE.Vector3() },
    lightColor: { value: new THREE.Color() },
    modelViewMatrix: { value: new THREE.Matrix4() },
    projectionMatrix: { value: new THREE.Matrix4() },
  },
});