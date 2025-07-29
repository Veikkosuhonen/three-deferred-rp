import * as THREE from "three";

const buildingShaderFS = /* glsl */ `
precision highp float;

layout (location = 0) out vec4 gColorAo;
layout (location = 1) out vec4 gNormalRoughness;
layout (location = 2) out vec4 gPositionMetalness;
layout (location = 3) out vec4 gEmission;
layout (location = 4) out vec4 gVelocity;

in vec3 vPosition;
in vec3 vPositionWS;
in vec4 vPositionCS;
in vec4 vPreviousPositionCS;
in vec3 vNormal;
in vec3 vNormalWS;
in vec3 vColor;

// uniform float emissiveIntensity;
// uniform vec3 emissive;

void main() {
  vec3 diffuse = vColor;

  vec3 normalVS = normalize(vNormal);
  vec3 normalWS = normalize(vNormalWS);

  float isRoof = step(0.5, normalWS.y);
  float isWall = 1.0 - isRoof;

  float floorN = floor(vPositionWS.y * 0.666 + 0.2);
  float isWindowRow = mod(floorN, 2.0);
  float isWindow = isWall * isWindowRow;

  float windowCheckers = mod(sin(floorN * 20.0) * floor(vPositionWS.x + vPositionWS.z), 10.0);
  windowCheckers *= step(windowCheckers, 1.0)
    + step(4.0, windowCheckers) * step(windowCheckers, 5.0)
    + step(5.0, windowCheckers) * step(windowCheckers, 10.0) * step(floorN, 2.0);
  windowCheckers = mod(windowCheckers, 4.0);
  // windowCheckers *= 0.6;

  float isLitWindow = isWindow * windowCheckers;

  float roughness = 1.0 - isWindow * 0.9;
  float metallic = 0.0;
  vec3 emissive = vec3(1.0, 0.75, 0.25);
  float emissiveIntensity = isLitWindow;

  vec3 orm = vec3(1.0, roughness, metallic);

  vec3 currentPosNDC = vPositionCS.xyz / vPositionCS.w;
  vec3 previousPosNDC = vPreviousPositionCS.xyz / vPreviousPositionCS.w;
  vec2 velocity = currentPosNDC.xy - previousPosNDC.xy;

  vec3 position = vPosition;

  float ao = orm.r;
  float roughnessM = orm.g;
  float metalnessM = orm.b;

  gColorAo = vec4(diffuse, ao);
  gNormalRoughness = vec4(normalVS, roughnessM);
  gPositionMetalness = vec4(position, metalnessM);
  gEmission = vec4(emissive * emissiveIntensity, 0.0);
  gVelocity = vec4(velocity, 0.0, 0.0);
}
`;

const buildingShaderVS = /* glsl */ `
precision highp float;

in vec3 tangent;
in vec3 color;

uniform mat4 previousWorldMatrix;
uniform mat4 previousViewMatrix;

out vec3 vPosition;
out vec2 vUv;
out vec3 vPositionWS;
out vec4 vPositionCS;
out vec4 vPreviousPositionCS;

out vec3 vNormal;
out vec3 vNormalWS;
out vec3 vColor;

void main() {
  //#ifdef USE_INSTANCING
  mat4 mMatrix = modelMatrix * instanceMatrix;
  mat4 mvMatrix = viewMatrix * mMatrix;
  //#else
  //mat4 mMatrix = modelMatrix;
  //mat4 mvMatrix = modelViewMatrix;
  //#endif

  vec4 normalWS = mMatrix * vec4(normal, 0.0);
  vNormalWS = normalWS.xyz;

  vec4 normalVS = viewMatrix * normalWS;
  vNormal = normalVS.xyz;

  vUv = uv;

  vColor = color;

  vec4 posWS = mMatrix * vec4(position, 1.0);
  vPositionWS = posWS.xyz;

  vec4 posVS = viewMatrix * posWS;
  vPosition = posVS.xyz;

  vec4 previousPosWS = previousWorldMatrix * vec4(position, 1.0);
  vec4 previousPosVS = previousViewMatrix * previousPosWS;
  vPreviousPositionCS = projectionMatrix * previousPosVS;

  gl_Position = projectionMatrix * posVS;

  vPositionCS = gl_Position;
}
`;

export const buildingMaterial = new THREE.ShaderMaterial({
  name: "BuildingMaterial",
  vertexShader: buildingShaderVS,
  fragmentShader: buildingShaderFS,
  uniforms: {
    previousWorldMatrix: { value: new THREE.Matrix4() },
    previousViewMatrix: { value: new THREE.Matrix4() },
  },
  defines: {
    USE_INSTANCING: "",
  },
  side: THREE.FrontSide,
  glslVersion: "300 es",
  depthWrite: true,
  transparent: false,
  stencilWrite: true,
  stencilFunc: THREE.AlwaysStencilFunc,
  stencilZPass: THREE.ReplaceStencilOp,
  stencilFail: THREE.ReplaceStencilOp,
  stencilZFail: THREE.ReplaceStencilOp,
  stencilFuncMask: 0xff,
  stencilWriteMask: 0xff,
  stencilRef: 1,
  userData: {
    materialKeys: [],
    attributes: [{ name: "color", size: 3 }],
  },
});
