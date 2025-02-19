const vertexJitter = `
    varying vec2 vUv;
    uniform float uJitterLevel;
    void main() {
        vUv = uv;
        vec4 v = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * v;
        gl_Position /= gl_Position.w;
        gl_Position.xy = floor(gl_Position.xy * uJitterLevel) / uJitterLevel * gl_Position.w;
    }
`;
export default vertexJitter;
