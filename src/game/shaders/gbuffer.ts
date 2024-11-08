import * as THREE from 'three';

/**
 * G-Buffer shader
 */

const gBufferShaderVS = /* glsl */ `
precision highp float;

layout (location = 3) in vec3 tangent;

out vec2 vUv;
out vec3 vPosition;

#ifdef USE_NORMAL_MAP
out mat3 TBN;
#else
out vec3 vNormal;
#endif

void main() {
  #ifdef USE_NORMAL_MAP
  vec3 T = normalize(vec3(viewMatrix * modelMatrix * vec4(tangent,   0.0)));
  vec3 N = normalize(vec3(viewMatrix * modelMatrix * vec4(normal,    0.0)));
  // re-orthogonalize T with respect to N
  T = normalize(T - dot(T, N) * N);
  // then retrieve perpendicular vector B with the cross product of T and N
  vec3 B = cross(N, T);
  TBN = mat3(T, B, N);
  #else
  vNormal = (viewMatrix * modelMatrix * vec4(normal, 0.0)).xyz;
  #endif

  vUv = uv;
  vec4 posWS = modelMatrix * vec4(position, 1.0);
  vec4 posVS = viewMatrix * posWS;
  vPosition = posVS.xyz;
  gl_Position = projectionMatrix * posVS;
}
`;

const gBufferShaderFS = /* glsl */ `
precision highp float;

layout (location = 0) out vec4 gColorAo;
layout (location = 1) out vec4 gNormalRoughness;
layout (location = 2) out vec4 gPositionMetalness;
layout (location = 3) out vec4 gEmission;

in vec3 vPosition;
in vec2 vUv;

#ifdef USE_NORMAL_MAP
in mat3 TBN;
#else
in vec3 vNormal;
#endif

#ifdef USE_MAP
uniform sampler2D map;
#else
uniform vec3 color;
#endif

#ifdef USE_NORMAL_MAP
uniform sampler2D normalMap;
#endif

#ifdef USE_ORM_MAP
uniform sampler2D roughnessMap; // Actually ORM
#else
uniform float roughness;
uniform float metalness;
#endif

#ifdef USE_EMISSION_MAP
uniform sampler2D emissiveMap;
#else
uniform vec3 emissive;
#endif
uniform float emissiveIntensity;

void main() {
  #ifdef USE_MAP
  vec3 diffuse = texture(map, vUv).rgb;
  #else
  vec3 diffuse = color;
  #endif

  #ifdef USE_NORMAL_MAP
  vec3 normal = texture(normalMap, vUv).xyz * 2.0 - 1.0;
  normal = normalize(TBN * normal);
  #else
  vec3 normal = normalize(vNormal);
  #endif

  #ifdef USE_ORM_MAP
  vec3 orm = texture(roughnessMap, vUv).rgb;
  orm.b = 1.0 - orm.b; // Invert metalness value coming from texture
  #else
  vec3 orm = vec3(1.0, roughness, metalness);
  #endif

  #ifdef USE_EMISSION_MAP
  vec3 emissive = texture(emissiveMap, vUv).rgb;
  #endif

  vec3 position = vPosition;

  float ao = orm.r;
  float roughnessM = orm.g;
  float metalnessM = orm.b;

  gColorAo = vec4(diffuse, ao);
  gNormalRoughness = vec4(normal, roughnessM);
  gPositionMetalness = vec4(position, metalnessM);
  gEmission = vec4(emissiveIntensity * emissive, 1.0);
}
`;

export const getVariantKey = (useMap: boolean, useNormalMap: boolean, useOrmMap: boolean, useEmissionMap: boolean) => {
  return (useMap ? 8 : 0) | (useNormalMap ? 4 : 0) | (useOrmMap ? 2 : 0) | (useEmissionMap ? 1 : 0);
}

export const gBufferShaderVariants: Record<number, THREE.ShaderMaterial> = {};

(() => {

  // Four bits for USE_MAP, USE_NORMAL_MAP, USE_ORM_MAP, USE_EMISSION_MAP
  for (let use_map = 0; use_map < 2; use_map++) {
    for (let use_normal_map = 0; use_normal_map < 2; use_normal_map++) {
      for (let use_orm_map = 0; use_orm_map < 2; use_orm_map++) {
        for (let use_emission_map = 0; use_emission_map < 2; use_emission_map++) {
          const key = getVariantKey(!!use_map, !!use_normal_map, !!use_orm_map, !!use_emission_map);

          const defines: Record<string, string> = {};
          const uniforms: Record<string, THREE.IUniform> = {
            emissiveIntensity: { value: 1.0 },
          };

          if (use_map) { defines.USE_MAP = ""; uniforms.map = { value: null }; } else { uniforms.color = { value: new THREE.Color() }; }
          if (use_normal_map) { defines.USE_NORMAL_MAP = ""; uniforms.normalMap = { value: null }; }
          if (use_orm_map) { defines.USE_ORM_MAP = ""; uniforms.roughnessMap = { value: null }; } else { uniforms.roughness = { value: 0.0 }; uniforms.metalness = { value: 0.0 }; }
          if (use_emission_map) { defines.USE_EMISSION_MAP = ""; uniforms.emissiveMap = { value: null }; } else { uniforms.emissive = { value: new THREE.Color() }; }

          gBufferShaderVariants[key] = new THREE.ShaderMaterial({
            vertexShader: gBufferShaderVS,
            fragmentShader: gBufferShaderFS,
            side: THREE.FrontSide,
            glslVersion: "300 es",
            depthWrite: true,
            stencilWrite: true,
            stencilFunc: THREE.AlwaysStencilFunc,
            stencilZPass: THREE.ReplaceStencilOp,
            stencilFail: THREE.ReplaceStencilOp,
            stencilZFail: THREE.ReplaceStencilOp,
            stencilFuncMask: 0xff,
            stencilWriteMask: 0xff,
            stencilRef: 1,
            defines,
            uniforms,
            name: Object.keys(defines).join(", "),
          });
        }
      }
    }
  }

  console.log("G-Buffer shader variants", gBufferShaderVariants);
})();
