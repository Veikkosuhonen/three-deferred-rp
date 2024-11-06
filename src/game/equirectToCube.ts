import * as THREE from 'three';

export const equirectToCube = (renderer: THREE.WebGLRenderer, equirect: THREE.Texture, size: number) => {
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(size);
  return cubeRenderTarget.fromEquirectangularTexture(renderer, equirect);
};

export const equirectToPMREM = (renderer: THREE.WebGLRenderer, equirect: THREE.Texture) => {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  equirect.mapping = THREE.EquirectangularReflectionMapping;
  const envMap = pmremGenerator.fromEquirectangular(equirect).texture;
  
  return envMap;
}

export const cubeToIrradiance = (renderer: THREE.WebGLRenderer, cubeMap: THREE.CubeTexture, size: number) => {
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(size);
  const cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRenderTarget);

  irradianceShader.uniforms.envMap.value = cubeMap;
  irradianceShader.uniforms.exposure.value = 0.1;
  irradianceShader.uniformsNeedUpdate = true;

  const scene = new THREE.Scene();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), irradianceShader);
  scene.add(box);


  cubeCamera.update(renderer, scene);

  return cubeRenderTarget;
}

const irradianceShader = new THREE.ShaderMaterial({
  glslVersion: THREE.GLSL3,
  side: THREE.BackSide,
  uniforms: {
    envMap: { value: null },
    exposure: { value: 1.0 },
  },
  vertexShader: /* glsl */ `

out vec3 vPosition;

void main() {
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,

  fragmentShader: /* glsl */ `

precision highp float;

in vec3 vPosition;

out vec4 FragColor;

uniform samplerCube envMap;
uniform float exposure;

const float PI = 3.14159265359;

void main() {
  vec3 normal = normalize(vPosition);
  vec3 irradiance = vec3(0.0);
  
  vec3 up    = vec3(0.0, 1.0, 0.0);
  vec3 right = normalize(cross(up, normal));
  up         = normalize(cross(normal, right));

  const float sampleDelta = 0.025;
  float nrSamples = 0.0; 
  for (float phi = 0.0; phi < 2.0 * PI; phi += sampleDelta) {
    for (float theta = 0.0; theta < 0.5 * PI; theta += sampleDelta) {
      // spherical to cartesian (in tangent space)
      vec3 tangentSample = vec3(sin(theta) * cos(phi),  sin(theta) * sin(phi), cos(theta));
      // tangent space to world
      vec3 sampleVec = tangentSample.x * right + tangentSample.y * up + tangentSample.z * normal; 

      irradiance += texture(envMap, sampleVec).rgb * cos(theta) * sin(theta);
      nrSamples++;
    }
  }
  irradiance = PI * irradiance * (1.0 / float(nrSamples));

  // Exposure
  irradiance = 1.0 - exp(-irradiance * exposure);

  FragColor = vec4(irradiance, 1.0);
}

  `,
});
