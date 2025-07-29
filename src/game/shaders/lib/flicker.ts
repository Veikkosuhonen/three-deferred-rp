export const flicker = /* glsl */ `
float flicker(vec4 co) {
  co.w *= 10.0; // Quantize time
  co.w = floor(co.w);
  float seed = fract(sin(dot(co, vec4(12.9898, 78.233, -23.112, 31.6831))) * 43758.5453);
  float flicker = step(0.5, seed); // Flicker effect
  return flicker;
}
`;