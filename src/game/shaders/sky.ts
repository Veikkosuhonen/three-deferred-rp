import * as THREE from "three";

const skyShaderVS = /* glsl */ `
in vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const skyShaderFS = /* glsl */ `
precision highp float;

uniform samplerCube envMap;
uniform mat4 inverseProjection;
uniform mat4 inverseViewMatrix;
uniform vec2 u_resolution;

uniform float gamma;
uniform float exposure;

out vec4 FragColor;


void main() {
  vec2 ndc = (gl_FragCoord.st / u_resolution) * 2.0 - 1.0;
  vec4 clipSpacePosition = vec4(ndc, 1.0, 1.0);
  vec4 viewSpacePos = inverseProjection * clipSpacePosition;
  viewSpacePos /= viewSpacePos.w; // Perspective divide
  vec3 viewDir = normalize(viewSpacePos.xyz);
  vec3 viewDirectionWS = (inverseViewMatrix * vec4(viewDir, 0.0)).xyz;
  vec3 color = texture(envMap, viewDirectionWS).rgb;

  // Gamma
  color = pow(color, vec3(1.0 / gamma));

  // Exposure
  color = 1.0 - exp(-color * exposure);

  FragColor = vec4(color, 1.0);
}
`;

export const skyShader = new THREE.RawShaderMaterial({
  vertexShader: skyShaderVS,
  fragmentShader: skyShaderFS,
  side: THREE.FrontSide,
  glslVersion: "300 es",
  depthWrite: false,
  depthTest: false,

  stencilWrite: true,
  stencilFunc: THREE.NotEqualStencilFunc,
  stencilZPass: THREE.KeepStencilOp,
  stencilFail: THREE.KeepStencilOp,
  stencilZFail: THREE.KeepStencilOp,
  stencilFuncMask: 0xff,
  stencilWriteMask: 0xff,
  stencilRef: 1,

  uniforms: {
    envMap: { value: null },
    u_resolution: { value: new THREE.Vector2() },
    inverseProjection: { value: new THREE.Matrix4() },
    inverseViewMatrix: { value: new THREE.Matrix4() },
    gamma: { value: 2.2 },
    exposure: { value: 1.0 },
  },
});
