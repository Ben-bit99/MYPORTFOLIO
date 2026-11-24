/** Shared GLSL snippets for the procedural scenes. */

export const NOISE = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),u.x), mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0.; float a=.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=.5; } return v; }
`;

/** Iridescent fresnel rim on a near-black body (focal objects). */
export const iridescentVert = /* glsl */ `
varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){
  vec4 wp = modelMatrix * vec4(position,1.);
  vW = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

export const iridescentFrag = /* glsl */ `
uniform float uTime; uniform vec3 uBase; uniform float uRim; uniform float uShift; uniform float uOpacity; uniform vec3 uTint; uniform float uTintMix;
varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){
  float f = pow(1. - max(dot(normalize(vN), normalize(vV)), 0.), 2.6);
  vec3 iri = .5 + .5*cos(6.28318*(f*1.15 + uTime*.04 + uShift + vW.y*.08 + vec3(0.,.33,.67)));
  float sheen = pow(max(dot(normalize(vN), normalize(vec3(.3,.8,.5))),0.), 12.)*.25;
  iri = mix(iri, uTint, uTintMix);
  vec3 col = uBase + iri * f * uRim + sheen;
  gl_FragColor = vec4(col, uOpacity);
}`;

export const skyVert = /* glsl */ `
varying vec3 vP;
void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;

export const skyFrag = /* glsl */ `
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom; uniform float uTime; uniform float uStars; uniform float uClouds;
varying vec3 vP;
${NOISE}
void main(){
  float y = vP.y;
  vec3 col = y > 0. ? mix(uHorizon, uTop, pow(smoothstep(0., .6, y), .7)) : mix(uHorizon, uBottom, smoothstep(0., -.2, y));
  // soft clouds
  vec2 uv = vP.xz / max(.15, vP.y + .25);
  float c = fbm(uv*1.4 + vec2(uTime*.01, 0.));
  float c2 = fbm(uv*3.1 - vec2(uTime*.006, 0.) + 9.);
  float cloud = smoothstep(.42, .85, c*.7 + c2*.45) * smoothstep(.0, .3, y);
  col = mix(col, uHorizon*1.25 + vec3(.04,.05,.07), cloud * .55 * uClouds);
  col -= vec3(.02,.025,.03) * smoothstep(.55,.9,c2) * uClouds * smoothstep(.0,.3,y);
  // stars
  vec2 sp = floor(vP.xy * 260. + vP.z * 91.);
  float s = step(.9975, hash12(sp)) * smoothstep(.15, .5, y) * uStars * (1. - cloud*.9);
  col += s * (.6 + .4*sin(uTime*2. + hash12(sp+3.)*20.));
  gl_FragColor = vec4(col, 1.);
}`;
