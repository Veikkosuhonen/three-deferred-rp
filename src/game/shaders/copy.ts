import * as THREE from 'three';
import { screenVS } from './screenVS';

const copyFS = /* glsl */ `
precision highp float;

uniform sampler2D inputTexture;
uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  fragColor = texture(inputTexture, uv);
}
`;

export const copyShader = new THREE.RawShaderMaterial({
  glslVersion: "300 es",
  uniforms: {
    inputTexture: { value: null },
    u_resolution: { value: new THREE.Vector2() },
  },
  vertexShader: screenVS,
  fragmentShader: copyFS,
});
