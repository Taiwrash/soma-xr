import {
  Color,
  DoubleSide,
  FrontSide,
  LessEqualDepth,
  EqualDepth,
  NormalBlending,
  ShaderMaterial,
  Vector3,
  Vector4,
} from '@iwsdk/core';

/**
 * Single monochromatic palette (clinical cobalt). Every tissue is drawn with this one hue,
 * differentiated only by radiographic density, rim sharpness and lightness.
 */
export const MONO_CORE_HEX = 0x0284c7;
export const MONO_RIM_HEX = 0x075985;
export const MONO_DEEP_HEX = 0x0c4a6e;

export type TissueKind = 'bone' | 'cartilage' | 'organ' | 'lung' | 'muscle' | 'skin' | 'nerve';

export interface SharedXRayUniforms {
  uTime: { value: number };
  uLookMode: { value: number };
  uBrightness: { value: number };
  uBaseOpacity: { value: number };
  uEdgeFeather: { value: number };
  uRevealMode: { value: number };
  uLensCenter: { value: Vector3 };
  uLensRadius: { value: number };
  uClipPlane: { value: Vector4 };
}

export function createSharedXRayUniforms(): SharedXRayUniforms {
  return {
    uTime: { value: 0 },
    uLookMode: { value: 0 },
    uBrightness: { value: 1.0 },
    uBaseOpacity: { value: 0.9 },
    uEdgeFeather: { value: 0.17 },
    uRevealMode: { value: 0 },
    uLensCenter: { value: new Vector3(0, 1.1, -2.4) },
    uLensRadius: { value: 0.22 },
    uClipPlane: { value: new Vector4(1, 0, 0, 0) },
  };
}

interface TissueParams {
  density: number;
  fresnelPower: number;
  solidAlpha: number;
  rimOnly: number;
  lightness: number; // 0 = deep ink, 1 = pale
  gyri?: number;
  striation?: number;
  renderOrder: number;
}

export const TISSUES: Record<TissueKind, TissueParams> = {
  bone: { density: 0.2, fresnelPower: 1.75, solidAlpha: 1, rimOnly: 0, lightness: 0.24, renderOrder: 40 },
  cartilage: { density: 0.1, fresnelPower: 2.2, solidAlpha: 1, rimOnly: 0, lightness: 0.58, renderOrder: 41 },
  organ: { density: 0.13, fresnelPower: 2.0, solidAlpha: 1, rimOnly: 0, lightness: 0.44, renderOrder: 30 },
  lung: { density: 0.035, fresnelPower: 2.8, solidAlpha: 0.72, rimOnly: 0, lightness: 0.8, renderOrder: 20 },
  nerve: { density: 0.16, fresnelPower: 1.85, solidAlpha: 1, rimOnly: 0, lightness: 0.34, gyri: 0.85, renderOrder: 31 },
  muscle: { density: 0.045, fresnelPower: 2.6, solidAlpha: 0.52, rimOnly: 0, lightness: 0.65, striation: 0.9, renderOrder: 50 },
  skin: { density: 0.0, fresnelPower: 5.2, solidAlpha: 0.0, rimOnly: 1, lightness: 0.55, renderOrder: 101 },
};

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vLocalPos;
  void main() {
    vLocalPos = position;
    vec4 localPos = vec4(position, 1.0);
    mat3 lin = mat3(modelMatrix);
    #ifdef USE_INSTANCING
      localPos = instanceMatrix * localPos;
      lin = lin * mat3(instanceMatrix);
    #endif
    vec4 worldPosition = modelMatrix * localPos;
    vWorldPos = worldPosition.xyz;
    vec3 c0 = lin[0];
    vec3 c1 = lin[1];
    vec3 c2 = lin[2];
    float detSign = dot(c0, cross(c1, c2)) < 0.0 ? -1.0 : 1.0;
    mat3 normalMat = mat3(cross(c1, c2), cross(c2, c0), cross(c0, c1)) * detSign;
    vWorldNormal = normalize(normalMat * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uLookMode;
  uniform float uBrightness;
  uniform float uBaseOpacity;
  uniform float uEdgeFeather;
  uniform float uRevealMode;
  uniform vec3 uLensCenter;
  uniform float uLensRadius;
  uniform vec4 uClipPlane;

  uniform vec3 uMonoCore;
  uniform vec3 uMonoRim;
  uniform vec3 uMonoDeep;
  uniform float uFresnelPower;
  uniform float uDensity;
  uniform float uSolidAlpha;
  uniform float uRimOnly;
  uniform float uLightness;
  uniform float uGyri;
  uniform float uStriation;
  uniform float uHighlight;

  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vLocalPos;

  void main() {
    float revealMask = 1.0;
    float cutRim = 0.0;
    float feather = max(0.015, uEdgeFeather);

    if (uRevealMode > 0.5 && uRevealMode < 1.5) {
      float dist = distance(vWorldPos, uLensCenter);
      float innerR = uLensRadius * max(0.15, 1.0 - feather * 1.65);
      revealMask = 1.0 - smoothstep(innerR, uLensRadius, dist);
      cutRim = smoothstep(uLensRadius * 0.03, 0.0, abs(dist - uLensRadius * 0.97)) * 0.8;
      // faint ghost outside the lens keeps the whole body legible while the lens reveals full detail
      revealMask = max(revealMask, 0.14);
    } else if (uRevealMode > 1.5) {
      float sd = dot(uClipPlane.xyz, vWorldPos) + uClipPlane.w;
      float band = feather * 0.05;
      revealMask = smoothstep(-band, band, sd);
      cutRim = smoothstep(0.004, 0.0, abs(sd)) * 0.9;
    }
    // Skin is only a delicate outer silhouette guide (zero interior fill)
    if (uRimOnly > 0.5) { revealMask = max(revealMask, 0.22); cutRim = 0.0; }
    if (revealMask <= 0.004 && cutRim <= 0.01) discard;

    vec3 N = normalize(vWorldNormal);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vWorldPos);
    float ndotv = clamp(abs(dot(N, V)), 0.0, 1.0);
    float fresnel = pow(1.0 - ndotv, uFresnelPower);

    float detail = 1.0;
    if (uGyri > 0.01) {
      float f = sin(vLocalPos.x * 310.0 + sin(vLocalPos.z * 260.0) * 2.0) * cos(vLocalPos.y * 290.0 + cos(vLocalPos.x * 210.0) * 1.7);
      detail = mix(1.0, 0.85 + 0.15 * f, uGyri);
    }
    if (uStriation > 0.01) {
      float fib = sin(vLocalPos.y * 520.0 + vLocalPos.x * 140.0);
      detail *= mix(1.0, 0.9 + 0.1 * fib, uStriation);
    }

    vec3 pale = vec3(0.90, 0.95, 0.99);
    vec3 col;
    float alpha;

    if (uLookMode < 0.5) {
      // Clinical radiograph: transparent interior with sharp grazing cortical ink lines
      if (uRimOnly > 0.5) {
        col = mix(uMonoCore, pale, 0.25);
        alpha = pow(1.0 - ndotv, 5.2) * 0.28 * uBaseOpacity;
      } else {
        float faceWeight = gl_FrontFacing ? 1.0 : 0.32;
        vec3 fill = mix(uMonoCore, pale, clamp(uLightness + 0.12, 0.0, 1.0));
        vec3 ink = mix(uMonoRim, uMonoDeep, fresnel);
        col = mix(fill, ink, clamp(fresnel * 1.35, 0.0, 1.0)) * detail;
        float contrastGain = clamp(0.65 + uBrightness * 0.45, 0.4, 1.45);
        alpha = (uDensity * 0.22 * faceWeight + fresnel * (0.42 + uDensity * 0.85) * (gl_FrontFacing ? 1.0 : 0.55)) * contrastGain * uBaseOpacity;
      }
      col = mix(col, uMonoDeep, cutRim);
      alpha = clamp(alpha * revealMask + cutRim, 0.0, 0.92);
    } else {
      // Solid studio: soft hemisphere + key light, single hue ramp
      vec3 L1 = normalize(vec3(0.4, 0.85, 0.6));
      vec3 L2 = normalize(vec3(-0.6, 0.2, 0.4));
      float wrap = 0.35;
      float d1 = max((dot(N, L1) + wrap) / (1.0 + wrap), 0.0);
      float d2 = max(dot(N, L2), 0.0) * 0.25;
      float hemi = 0.5 + 0.5 * N.y;
      vec3 H = normalize(L1 + V);
      float spec = pow(max(dot(N, H), 0.0), 40.0) * 0.18;
      vec3 base = mix(uMonoCore, pale, 0.45 + uLightness * 0.4) * detail;
      vec3 shadowCol = mix(uMonoDeep, uMonoCore, 0.35);
      col = mix(shadowCol, base, clamp(d1 * 0.75 + d2 + hemi * 0.2, 0.0, 1.0)) + spec;
      col += uMonoCore * fresnel * 0.12;
      col *= clamp(0.82 + uBrightness * 0.18, 0.6, 1.25);
      if (uRimOnly > 0.5) {
        col = mix(uMonoCore, pale, 0.35);
        alpha = pow(1.0 - ndotv, 4.8) * 0.24 * uBaseOpacity;
      } else {
        alpha = uSolidAlpha;
      }
      col = mix(col, uMonoDeep, cutRim);
      alpha = clamp(alpha * revealMask + cutRim, 0.0, 1.0);
    }

    if (uHighlight > 0.01) {
      float pulse = 0.8 + 0.2 * sin(uTime * 5.0);
      col = mix(col, uMonoDeep, clamp(uHighlight * pulse * 0.65, 0.0, 0.8));
      alpha = max(alpha, (uLookMode < 0.5 ? 0.52 : 0.9) * revealMask * uHighlight);
    }

    gl_FragColor = vec4(col, alpha);
  }
`;

export function createTissueMaterial(shared: SharedXRayUniforms, kind: TissueKind): ShaderMaterial {
  const p = TISSUES[kind];
  const mat = new ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    side: kind === 'skin' ? FrontSide : DoubleSide,
    blending: NormalBlending,
    uniforms: {
      uTime: shared.uTime,
      uLookMode: shared.uLookMode,
      uBrightness: shared.uBrightness,
      uBaseOpacity: shared.uBaseOpacity,
      uEdgeFeather: shared.uEdgeFeather,
      uRevealMode: shared.uRevealMode,
      uLensCenter: shared.uLensCenter,
      uLensRadius: shared.uLensRadius,
      uClipPlane: shared.uClipPlane,
      uMonoCore: { value: new Color(MONO_CORE_HEX) },
      uMonoRim: { value: new Color(MONO_RIM_HEX) },
      uMonoDeep: { value: new Color(MONO_DEEP_HEX) },
      uFresnelPower: { value: p.fresnelPower },
      uDensity: { value: p.density },
      uSolidAlpha: { value: p.solidAlpha },
      uRimOnly: { value: p.rimOnly },
      uLightness: { value: p.lightness },
      uGyri: { value: p.gyri ?? 0 },
      uStriation: { value: p.striation ?? 0 },
      uHighlight: { value: 0 },
    },
  });
  mat.userData.kind = kind;
  if (kind === 'skin') {
    // Drawn after the depth pre-pass: only the front-most skin surface shades once (no overlap seams)
    mat.depthFunc = EqualDepth;
  }

  mat.userData.syncLook = (isSolid: boolean) => {
    const opaque = isSolid && p.solidAlpha >= 0.99;
    if (mat.transparent === opaque || mat.depthWrite !== opaque) {
      mat.transparent = !opaque;
      mat.depthWrite = opaque;
      mat.needsUpdate = true;
    }
  };
  return mat;
}

/** Depth-only pre-pass for the skin shell (renders after internal anatomy). */
export function createSkinDepthMaterial(): ShaderMaterial {
  const m = new ShaderMaterial({
    vertexShader: `
      void main() {
        vec4 localPos = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          localPos = instanceMatrix * localPos;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * localPos;
      }
    `,
    fragmentShader: `void main(){ gl_FragColor = vec4(0.0); }`,
    transparent: true,
    depthWrite: true,
    depthFunc: LessEqualDepth,
    colorWrite: false,
    side: FrontSide,
  });
  return m;
}

/** Kept for hand rigs and other callers. */
export function createAnatomyMaterial(shared: SharedXRayUniforms, kind: TissueKind = 'bone'): ShaderMaterial {
  return createTissueMaterial(shared, kind);
}
