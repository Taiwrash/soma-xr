import {
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  LessEqualDepth,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from '@iwsdk/core';
import {
  alignY,
  loft,
  mergeGeos,
  place,
  ridged,
  sampleProfile,
  sculptSphere,
  smoothstep,
  straightBone,
  thickSurface,
  V,
} from './geometryKit';
import {
  createSkinDepthMaterial,
  createTissueMaterial,
  MONO_CORE_HEX,
  MONO_DEEP_HEX,
  SharedXRayUniforms,
  TISSUES,
  TissueKind,
} from '../shaders/xrayMaterial';

/* ---------------------------------------------------------------------------
 * Coordinate convention (body root): origin at hip-joint height on the midline.
 * +Y up, +Z anterior (body faces the viewer), +X = viewer's right.
 * Proportions follow Drillis & Contini anthropometry for a 1.74 m adult:
 * crown +0.818, eyes +0.70, chin +0.59, shoulder joint +0.455, knee -0.426,
 * ankle -0.854, sole -0.922.
 * ------------------------------------------------------------------------- */

export type LayerKey = 'skeleton' | 'organs' | 'muscles' | 'skin';
export type Side = -1 | 1;
export type SegmentKey =
  | 'upperArm-L'
  | 'upperArm-R'
  | 'forearm-L'
  | 'forearm-R'
  | 'thigh-L'
  | 'thigh-R'
  | 'shank-L'
  | 'shank-R';
export type AttachKey = 'root' | 'head' | 'jaw' | SegmentKey | 'foot-L' | 'foot-R';

export const SOLE_Y = -0.922;
export const UPPER_ARM = 0.3;
export const FOREARM = 0.25;
export const THIGH = 0.426;
export const SHANK = 0.428;
export const HEAD_PIVOT = V(0, 0.615, -0.02);
export const shoulderJoint = (s: Side) => V(s * 0.185, 0.455, -0.03);
export const hipJoint = (s: Side) => V(s * 0.085, 0, 0.005);
const sideKey = (s: Side): 'L' | 'R' => (s < 0 ? 'L' : 'R');

export interface BodyPose {
  head?: { x: number; y: number; z: number };
  elbow?: [Vector3 | undefined, Vector3 | undefined]; // [L, R] rig-local targets
  wrist?: [Vector3 | undefined, Vector3 | undefined];
  knee?: [Vector3 | undefined, Vector3 | undefined];
  ankle?: [Vector3 | undefined, Vector3 | undefined];
}

export interface BodyRig {
  root: Group;
  headPivot: Group;
  jawPivot: Group;
  nodes: Record<AttachKey, Object3D>;
  layerMeshes: Record<LayerKey, Mesh[]>;
  materialsByStructure: Map<string, ShaderMaterial[]>;
  allMaterials: ShaderMaterial[];
  wristLocal: [Vector3, Vector3];
  forearmDirLocal: [Vector3, Vector3];
  setJawOpen(open01: number): void;
  updatePhysiology(t: number): void;
  updatePose(pose: BodyPose | null, t: number): void;
  setExploded(f: number): void;
  setLookMode(solid: boolean): void;
  setLayerVisibility(layers: Record<LayerKey, boolean>): void;
  highlightStructure(id: string | null): void;
}

/* ------------------------------ helpers ---------------------------------- */

const tmpM = new Matrix4();
const tmpX = new Vector3();
const tmpY = new Vector3();
const tmpZ = new Vector3();

/** Orients a segment group so local +Y points from distal (b) to proximal (a), +Z stays anterior. */
export function orientSegment(obj: Object3D, a: Vector3, b: Vector3, restLen: number, fwdHint = new Vector3(0, 0, 1)): void {
  tmpY.subVectors(a, b);
  const len = tmpY.length();
  if (len < 1e-5) return;
  tmpY.divideScalar(len);
  tmpZ.copy(fwdHint).addScaledVector(tmpY, -fwdHint.dot(tmpY));
  if (tmpZ.lengthSq() < 1e-4) tmpZ.set(0, 1, 0).addScaledVector(tmpY, -tmpY.y);
  tmpZ.normalize();
  tmpX.crossVectors(tmpY, tmpZ).normalize();
  tmpM.makeBasis(tmpX, tmpY, tmpZ);
  obj.quaternion.setFromRotationMatrix(tmpM);
  obj.position.addVectors(a, b).multiplyScalar(0.5);
  obj.scale.set(1, len / restLen, 1);
}

function solveTwoBone(root: Vector3, target: Vector3, l1: number, l2: number, pole: Vector3): Vector3 {
  const d = new Vector3().subVectors(target, root);
  const dist = Math.min((l1 + l2) * 0.999, Math.max(Math.abs(l1 - l2) + 1e-3, d.length()));
  const dir = d.normalize();
  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const a = Math.acos(Math.min(1, Math.max(-1, cosA)));
  const bend = pole.clone().addScaledVector(dir, -pole.dot(dir));
  if (bend.lengthSq() < 1e-6) bend.set(0, 0, -1);
  bend.normalize();
  return root.clone().addScaledVector(dir, Math.cos(a) * l1).addScaledVector(bend, Math.sin(a) * l1);
}

function maybeBVH(geo: BufferGeometry): void {
  const g = geo as unknown as { computeBoundsTree?: () => void };
  if (typeof g.computeBoundsTree === 'function') {
    try {
      g.computeBoundsTree();
    } catch {
      /* optional acceleration */
    }
  }
}

export function createFractureBeacon(): Group {
  const g = new Group();
  g.visible = false;
  const ink = new MeshBasicMaterial({ color: MONO_DEEP_HEX, transparent: true, opacity: 0.95, depthTest: false, side: DoubleSide });
  const soft = new MeshBasicMaterial({ color: MONO_CORE_HEX, transparent: true, opacity: 0.85, depthTest: false, side: DoubleSide });
  const crack = loft([V(-0.012, 0.004, 0), V(-0.004, -0.001, 0), V(0.002, 0.003, 0), V(0.011, -0.003, 0)], {
    radial: 4,
    section: () => ({ w: 0.0012, h: 0.0012 }),
  });
  const c = new Mesh(crack, ink);
  const r1 = new Mesh(new RingGeometry(0.017, 0.0195, 40), soft);
  const r2 = new Mesh(new RingGeometry(0.026, 0.0275, 40), ink);
  for (const m of [c, r1, r2]) m.renderOrder = 200;
  g.add(c, r1, r2);
  return g;
}

/* ------------------------------ builder ---------------------------------- */

export function buildBodyRig(shared: SharedXRayUniforms): BodyRig {
  const root = new Group();
  root.name = 'BodyRoot';
  const headPivot = new Group();
  headPivot.position.copy(HEAD_PIVOT);
  const jawPivot = new Group();
  jawPivot.position.set(0, 0.065, 0.015);
  headPivot.add(jawPivot);
  root.add(headPivot);

  const materialsByStructure = new Map<string, ShaderMaterial[]>();
  const allMaterials: ShaderMaterial[] = [];
  const layerMeshes: Record<LayerKey, Mesh[]> = { skeleton: [], organs: [], muscles: [], skin: [] };
  const matCache = new Map<string, ShaderMaterial>();
  const skinDepth = createSkinDepthMaterial();

  const matFor = (structureId: string, kind: TissueKind): ShaderMaterial => {
    const key = `${structureId}|${kind}`;
    let m = matCache.get(key);
    if (!m) {
      m = createTissueMaterial(shared, kind);
      matCache.set(key, m);
      allMaterials.push(m);
      const list = materialsByStructure.get(structureId) ?? [];
      list.push(m);
      materialsByStructure.set(structureId, list);
    }
    return m;
  };

  const add = (
    parent: Object3D,
    geos: BufferGeometry[],
    structureId: string,
    kind: TissueKind,
    layer: LayerKey
  ): Mesh => {
    const geo = mergeGeos(geos);
    maybeBVH(geo);
    const mesh = new Mesh(geo, matFor(structureId, kind));
    mesh.userData.structureId = structureId;
    mesh.userData.layer = layer;
    mesh.userData.basePos = new Vector3();
    mesh.renderOrder = TISSUES[kind].renderOrder;
    parent.add(mesh);
    layerMeshes[layer].push(mesh);
    return mesh;
  };

  const addSkin = (parent: Object3D, geos: BufferGeometry[]): void => {
    const geo = mergeGeos(geos);
    const pre = new Mesh(geo, skinDepth);
    pre.renderOrder = 100;
    const vis = new Mesh(geo, matFor('skin', 'skin'));
    vis.renderOrder = 101;
    vis.userData.layer = 'skin';
    vis.userData.basePos = new Vector3();
    pre.userData.layer = 'skin';
    pre.userData.basePos = new Vector3();
    pre.raycast = () => {};
    vis.raycast = () => {};
    parent.add(pre, vis);
    layerMeshes.skin.push(pre, vis);
  };

  /* ============================== HEAD =================================== */
  const skull: BufferGeometry[] = [];
  skull.push(
    place(
      sculptSphere(0.073, 0.095, 0.097, 56, 44, (u, o) => {
        if (u.y < -0.2) o.y = (-0.2 + (u.y + 0.2) * 0.45) * 0.095;
        if (u.z > 0.3 && u.y < 0.12) o.z -= (u.z - 0.3) * (0.12 - u.y) * 0.035;
        o.x *= 1 - 0.07 * Math.exp(-Math.pow(u.y / 0.35, 2)) * Math.abs(u.x);
        if (u.z < -0.65 && u.y > -0.35 && u.y < 0.15) o.z -= 0.003;
        // coronal & sagittal suture hints
        const sag = Math.exp(-Math.pow(u.x * 26, 2)) * (u.y > 0.1 ? 0.0012 : 0);
        const cor = Math.exp(-Math.pow((u.z - 0.2) * 20, 2)) * (u.y > 0.05 ? 0.001 : 0);
        o.y -= sag + cor;
      }),
      [0, 0.1, 0.02]
    )
  );
  // brow ridge
  skull.push(
    loft([V(-0.056, 0.103, 0.093), V(-0.03, 0.108, 0.111), V(0, 0.104, 0.117), V(0.03, 0.108, 0.111), V(0.056, 0.103, 0.093)], {
      radial: 8,
      section: (t) => ({ w: 0.004, h: 0.0042 + 0.0012 * Math.sin(Math.PI * t) }),
    })
  );
  for (const s of [-1, 1] as Side[]) {
    // orbital rims (closed elliptical rings, slightly turned outward)
    const c = V(s * 0.032, 0.085, 0.099);
    const ring: Vector3[] = [];
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      ring.push(V(c.x + Math.cos(a) * 0.0195, c.y + Math.sin(a) * 0.0172, c.z - Math.cos(a) * s * 0.006));
    }
    skull.push(loft(ring, { closed: true, radial: 7, tubular: 42, section: (t) => ({ w: 0.0032, h: 0.0036 + 0.0014 * Math.max(0, Math.sin(t * Math.PI * 2)) }) }));
    // zygomatic bone + arch
    skull.push(place(sculptSphere(0.013, 0.012, 0.009, 14, 10), [s * 0.048, 0.06, 0.087]));
    skull.push(
      loft([V(s * 0.044, 0.068, 0.092), V(s * 0.056, 0.06, 0.078), V(s * 0.066, 0.064, 0.05), V(s * 0.068, 0.066, 0.022), V(s * 0.064, 0.07, 0.005)], {
        radial: 8,
        section: (t) => ({ w: 0.0035, h: 0.0065 - 0.002 * t }),
        thinAxis: (_t, p) => V(p.x, 0, 0),
      })
    );
    // mastoid process
    skull.push(place(sculptSphere(0.008, 0.013, 0.008, 12, 10), [s * 0.051, 0.046, -0.012]));
    // maxillary cheek wall
    skull.push(place(sculptSphere(0.017, 0.02, 0.012, 14, 12), [s * 0.025, 0.045, 0.094]));
  }
  // nasal bones and pear-shaped aperture
  skull.push(loft([V(0, 0.099, 0.113), V(0, 0.086, 0.119), V(0, 0.072, 0.124)], { radial: 8, section: (t) => ({ w: 0.0018, h: 0.005 + 0.004 * t }), thinAxis: () => V(0, 0, 1) }));
  const nasal = [V(0, 0.073, 0.119), V(0.011, 0.062, 0.114), V(0.0125, 0.048, 0.111), V(0.007, 0.037, 0.113), V(0, 0.035, 0.116), V(-0.007, 0.037, 0.113), V(-0.0125, 0.048, 0.111), V(-0.011, 0.062, 0.114)];
  skull.push(loft(nasal, { closed: true, radial: 6, tubular: 32, section: () => ({ w: 0.0022, h: 0.0022 }) }));
  // maxilla & alveolar arch
  skull.push(
    place(
      sculptSphere(0.034, 0.02, 0.03, 24, 14, (u, o) => {
        if (u.z > 0.4) o.z -= (u.z - 0.4) * 0.008;
        if (u.y > 0.5) o.y -= (u.y - 0.5) * 0.006;
      }),
      [0, 0.03, 0.08]
    )
  );
  const upperTeeth: BufferGeometry[] = [];
  const lowerTeeth: BufferGeometry[] = [];
  const tooth = (a: number): BufferGeometry => {
    const k = Math.abs(a);
    const r = k < 0.3 ? 0.0027 : k < 0.45 ? 0.0031 : k < 0.7 ? 0.0036 : 0.0044;
    const len = k < 0.3 ? 0.0065 : k < 0.45 ? 0.008 : k < 0.7 ? 0.0055 : 0.0042;
    const g = sculptSphere(r * (k < 0.3 ? 1.35 : 1), len, r * (k < 0.3 ? 0.65 : 1), 10, 8);
    return g;
  };
  for (let i = 0; i < 16; i++) {
    const a = (i - 7.5) / 7.5;
    const x = (0.026 * Math.sin(a * 1.25)) / Math.sin(1.25);
    const z = 0.108 - 0.031 * a * a;
    upperTeeth.push(place(tooth(a), [x, 0.019, z], [0, a * 1.1, 0]));
    lowerTeeth.push(place(tooth(a), [x * 0.94, -0.057, z - 0.0185], [0, a * 1.1, 0]));
  }
  skull.push(...upperTeeth);
  add(headPivot, skull, 'cranium-skull', 'bone', 'skeleton');

  // Mandible (child of TMJ pivot, origin between the condyles)
  const mand: BufferGeometry[] = [];
  const jawPath = [
    V(-0.05, 0.0, 0.0),
    V(-0.049, -0.035, 0.004),
    V(-0.046, -0.066, 0.013),
    V(-0.037, -0.08, 0.046),
    V(-0.019, -0.088, 0.078),
    V(0, -0.09, 0.09),
    V(0.019, -0.088, 0.078),
    V(0.037, -0.08, 0.046),
    V(0.046, -0.066, 0.013),
    V(0.049, -0.035, 0.004),
    V(0.05, 0.0, 0.0),
  ];
  mand.push(
    loft(jawPath, {
      radial: 10,
      tubular: 70,
      section: (t) => {
        const mid = 1 - Math.abs(t - 0.5) * 2;
        return { w: 0.0038 + 0.0012 * mid, h: 0.0085 + 0.0055 * smoothstep(0.1, 0.35, mid) };
      },
      thinAxis: (_t, p) => V(p.x, 0, p.z - 0.03),
    })
  );
  for (const s of [-1, 1] as Side[]) {
    mand.push(place(sculptSphere(0.0115, 0.0065, 0.0065, 12, 8), [s * 0.05, 0.003, 0]));
    mand.push(loft([V(s * 0.047, -0.032, 0.018), V(s * 0.046, -0.014, 0.026), V(s * 0.044, -0.004, 0.03)], { radial: 6, section: (t) => ({ w: 0.0025, h: 0.006 * (1 - t * 0.6) }), thinAxis: () => V(1, 0, 0) }));
  }
  // lower teeth are authored directly in jaw-pivot space
  mand.push(...lowerTeeth);
  add(jawPivot, mand, 'mandible-tmj', 'bone', 'skeleton');

  // Brain, cerebellum, brainstem, eyes, optic nerves
  const brain: BufferGeometry[] = [];
  for (const s of [-1, 1] as Side[]) {
    brain.push(
      place(
        sculptSphere(0.033, 0.046, 0.082, 64, 48, (u, o) => {
          if (u.x * s < 0) o.x *= 0.8;
          if (u.y < -0.35) o.y = (-0.35 + (u.y + 0.35) * 0.45) * 0.046;
          if (u.y < -0.1 && u.z > -0.3 && u.z < 0.55 && u.x * s > 0.2) o.y -= 0.009 * smoothstep(-0.1, -0.6, u.y);
          if (u.z > 0.55 && u.y < 0) o.y += 0.004 * u.z;
          const sylv = Math.abs(u.y - (-0.12 + 0.32 * u.z));
          if (sylv < 0.07 && u.x * s > 0.45 && u.z > -0.2) o.multiplyScalar(0.975);
          const g = ridged(o, 420) - 0.5;
          o.addScaledVector(u, g * 0.0042);
        }),
        [s * 0.031, 0.108, 0.016]
      )
    );
    brain.push(
      place(
        sculptSphere(0.026, 0.017, 0.022, 32, 22, (u, o) => {
          o.addScaledVector(u, Math.sin(u.y * 38) * 0.0009);
        }),
        [s * 0.024, 0.058, -0.045]
      )
    );
    brain.push(place(new SphereGeometry(0.0118, 18, 14), [s * 0.032, 0.085, 0.086]));
    brain.push(loft([V(s * 0.032, 0.085, 0.075), V(s * 0.02, 0.083, 0.058), V(s * 0.006, 0.08, 0.045)], { radial: 6, section: () => ({ w: 0.0022, h: 0.0022 }) }));
  }
  brain.push(loft([V(0, 0.095, 0.002), V(0, 0.07, -0.008), V(0, 0.042, -0.012), V(0, 0.02, -0.01)], { radial: 10, section: (t) => ({ w: 0.012 - t * 0.004, h: 0.011 - t * 0.004 }) }));
  for (const g of brain) g.deleteAttribute('uv');
  add(headPivot, brain, 'brain', 'nerve', 'organs');

  // Facial muscles (temporalis fan, masseter)
  const faceMuscle: BufferGeometry[] = [];
  for (const s of [-1, 1] as Side[]) {
    faceMuscle.push(
      thickSurface(
        (u, v) => {
          const ang = -0.9 + u * 1.9;
          const r = 0.012 + v * 0.05;
          return V(s * (0.071 + 0.004 * Math.sin(Math.PI * v)), 0.068 + Math.cos(ang) * r * 0.9, 0.035 + Math.sin(ang) * r);
        },
        12,
        8,
        (_u, v) => 0.006 * (1 - v * 0.6)
      )
    );
    faceMuscle.push(loft([V(s * 0.058, 0.064, 0.072), V(s * 0.056, 0.035, 0.06), V(s * 0.052, 0.005, 0.045)], { radial: 8, section: (t) => ({ w: 0.0055, h: 0.012 - t * 0.003 }), thinAxis: () => V(1, 0, 0) }));
  }
  add(headPivot, faceMuscle, 'facial-muscles', 'muscle', 'muscles');

  // Head skin (soft-tissue envelope with nose, lips, chin and ears)
  const headSkin = sculptSphere(0.081, 0.118, 0.103, 48, 40, (u, o) => {
    if (u.y < 0) {
      const k = Math.pow(-u.y, 1.4);
      o.x *= 1 - 0.38 * k;
      o.z += 0.05 * k * Math.max(0, u.z + 0.35);
    }
    const nose = Math.exp(-(Math.pow((u.x) / 0.12, 2) + Math.pow((u.y + 0.2) / 0.16, 2))) * Math.max(0, u.z);
    o.z += nose * 0.019;
    const ear = Math.exp(-(Math.pow((Math.abs(u.x) - 0.98) / 0.06, 2) + Math.pow((u.y + 0.05) / 0.16, 2) + Math.pow((u.z + 0.05) / 0.2, 2)));
    o.x += Math.sign(u.x) * ear * 0.01;
  });
  addSkin(headPivot, [place(headSkin, [0, 0.082, 0.022])]);

  /* ============================ SPINE ==================================== */
  const spineCtrl = [
    V(0, 0.598, -0.024),
    V(0, 0.555, -0.014),
    V(0, 0.505, -0.03),
    V(0, 0.42, -0.064),
    V(0, 0.35, -0.078),
    V(0, 0.285, -0.073),
    V(0, 0.24, -0.06),
    V(0, 0.19, -0.042),
    V(0, 0.135, -0.03),
    V(0, 0.103, -0.036),
  ];
  const spineCurve = new (class {
    pts = spineCtrl;
    at(u: number): Vector3 {
      const n = this.pts.length - 1;
      const f = Math.min(n - 1e-6, Math.max(0, u * n));
      const i = Math.floor(f);
      const t = f - i;
      const p0 = this.pts[Math.max(0, i - 1)];
      const p1 = this.pts[i];
      const p2 = this.pts[Math.min(n, i + 1)];
      const p3 = this.pts[Math.min(n, i + 2)];
      const c = (a: number, b: number, cc: number, d: number) =>
        0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t * t + (-a + 3 * b - 3 * cc + d) * t * t * t);
      return V(c(p0.x, p1.x, p2.x, p3.x), c(p0.y, p1.y, p2.y, p3.y), c(p0.z, p1.z, p2.z, p3.z));
    }
  })();
  const levels: Array<{ type: 'c' | 't' | 'l'; w: number }> = [];
  for (let i = 0; i < 7; i++) levels.push({ type: 'c', w: 0.6 });
  for (let i = 0; i < 12; i++) levels.push({ type: 't', w: 1.0 });
  for (let i = 0; i < 5; i++) levels.push({ type: 'l', w: 1.4 });
  const totalW = levels.reduce((a, l) => a + l.w, 0);
  const vert: BufferGeometry[] = [];
  const discs: BufferGeometry[] = [];
  const thoracic: Array<{ p: Vector3 }> = [];
  let acc = 0;
  const vertebraCenters: Vector3[] = [];
  levels.forEach((lv, k) => {
    const u = (acc + lv.w * 0.5) / totalW;
    acc += lv.w;
    const p = spineCurve.at(u);
    const p2 = spineCurve.at(Math.min(1, u + 0.01));
    const p1 = spineCurve.at(Math.max(0, u - 0.01));
    const tangent = new Vector3().subVectors(p1, p2).normalize(); // points up
    vertebraCenters.push(p);
    const idxInType = lv.type === 't' ? k - 7 : lv.type === 'l' ? k - 19 : k;
    const sc = lv.type === 'c' ? 0.62 + idxInType * 0.02 : lv.type === 't' ? 0.82 + idxInType * 0.02 : 1.12 + idxInType * 0.04;
    const spacing = (lv.w / totalW) * 0.5;
    const rx = 0.0155 * sc;
    const rz = 0.0125 * sc;
    const parts: BufferGeometry[] = [];
    const body = new CylinderGeometry(1, 1, 1, 18, 1);
    body.deleteAttribute('uv');
    parts.push(place(body, [0, 0, 0], undefined, [rx, spacing * 0.68, rz]));
    const zb = -rz;
    parts.push(
      loft([V(-0.0075 * sc, 0, zb + 0.002), V(-0.0095 * sc, 0, zb - 0.01 * sc), V(0, 0.001, zb - 0.0165 * sc), V(0.0095 * sc, 0, zb - 0.01 * sc), V(0.0075 * sc, 0, zb + 0.002)], {
        radial: 6,
        section: () => ({ w: 0.0026 * sc, h: 0.0034 * sc }),
      })
    );
    const spEnd =
      lv.type === 'c' ? V(0, -0.006, zb - 0.03 * sc) : lv.type === 't' ? V(0, -0.026 * sc, zb - 0.042 * sc) : V(0, -0.006, zb - 0.036 * sc);
    parts.push(loft([V(0, 0.001, zb - 0.015 * sc), spEnd.clone().lerp(V(0, 0, zb - 0.015 * sc), 0.5).add(V(0, 0.002, 0)), spEnd], { radial: 6, section: (t) => ({ w: 0.0022 * sc, h: (lv.type === 'l' ? 0.0075 : 0.004) * sc * (1 - t * 0.3) }), thinAxis: () => V(1, 0, 0) }));
    const tpLen = lv.type === 'c' ? 0.022 : lv.type === 't' ? 0.03 : 0.034;
    for (const s of [-1, 1]) {
      parts.push(loft([V(s * 0.008 * sc, 0, zb - 0.006 * sc), V(s * tpLen * 0.6 * sc, 0.001, zb - 0.01 * sc), V(s * tpLen * sc, 0.002, zb - 0.014 * sc)], { radial: 6, section: (t) => ({ w: 0.0028 * sc * (1 - t * 0.3), h: 0.0028 * sc }) }));
    }
    const piece = mergeGeos(parts);
    alignY(piece, tangent, p);
    vert.push(piece);
    if (k < levels.length - 1) {
      const nextU = (acc + levels[Math.min(levels.length - 1, k + 1)].w * 0.5) / totalW;
      const pn = spineCurve.at(nextU);
      const mid = p.clone().lerp(pn, 0.5);
      const disc = new CylinderGeometry(1, 1, 1, 16, 1);
      disc.deleteAttribute('uv');
      place(disc, [0, 0, 0], undefined, [rx * 1.02, p.distanceTo(pn) * 0.28, rz * 1.02]);
      discs.push(alignY(disc, tangent, mid));
    }
    if (lv.type === 't') thoracic.push({ p });
  });
  // Sacrum & coccyx
  vert.push(
    loft([V(0, 0.088, -0.05), V(0, 0.055, -0.07), V(0, 0.02, -0.08), V(0, -0.015, -0.075), V(0, -0.035, -0.062)], {
      radial: 12,
      section: (t) => {
        const [h, w] = sampleProfile([[0, 0.05, 0.017], [0.3, 0.045, 0.014], [0.6, 0.031, 0.01], [0.85, 0.016, 0.007], [1, 0.007, 0.005]], t);
        return { w, h };
      },
      thinAxis: () => V(0, 0, 1),
    })
  );
  [V(0, -0.045, -0.054), V(0, -0.053, -0.047), V(0, -0.058, -0.04)].forEach((p, i) => vert.push(place(new SphereGeometry(0.006 - i * 0.001, 10, 8), p)));
  for (const g of vert) if (g.attributes.uv) g.deleteAttribute('uv');
  add(root, vert, 'vertebral-column', 'bone', 'skeleton');
  add(root, discs, 'vertebral-column', 'cartilage', 'skeleton');

  // Spinal cord & cauda equina
  const cordPts = [V(0, 0.6, -0.034)];
  for (let i = 0; i < 20; i++) cordPts.push(vertebraCenters[i].clone().add(V(0, 0, -0.022 * (i < 7 ? 0.7 : i < 19 ? 0.9 : 1.15))));
  const cord: BufferGeometry[] = [loft(cordPts, { radial: 8, section: (t) => ({ w: 0.0048 - t * 0.0015, h: 0.0042 - t * 0.0012 }) })];
  for (let k = -2; k <= 2; k++) {
    cord.push(loft([vertebraCenters[19].clone().add(V(0, 0, -0.026)), V(k * 0.004, 0.1, -0.072), V(k * 0.006, 0.04, -0.08)], { radial: 4, section: () => ({ w: 0.0012, h: 0.0012 }) }));
  }
  add(root, cord, 'brain', 'nerve', 'organs');

  /* ============================ THORAX =================================== */
  const ribW = [0.058, 0.082, 0.098, 0.108, 0.118, 0.125, 0.13, 0.133, 0.132, 0.127, 0.118, 0.1];
  const ribDrop = [0.028, 0.045, 0.055, 0.062, 0.068, 0.072, 0.075, 0.07, 0.06, 0.05, 0.03, 0.02];
  const ribZf = [0.062, 0.078, 0.088, 0.094, 0.098, 0.1, 0.1, 0.096, 0.088, 0.075, 0.02, -0.02];
  const stY = [0.462, 0.432, 0.405, 0.38, 0.355, 0.332, 0.312];
  const stZ = (y: number) => 0.072 + (0.47 - y) * 0.18;
  const margin = [V(0.03, 0.302, 0.104), V(0.052, 0.285, 0.1), V(0.074, 0.27, 0.094)];
  const ribs: BufferGeometry[] = [];
  const cart: BufferGeometry[] = [];
  for (let i = 0; i < 12; i++) {
    const vp = thoracic[i].p;
    const y = vp.y;
    const zv = vp.z;
    const w = ribW[i];
    const dr = ribDrop[i];
    const zf = ribZf[i];
    const zm = (zv - 0.034 + zf) / 2;
    for (const s of [-1, 1] as Side[]) {
      const pts = [V(s * 0.012, y, zv - 0.006), V(s * 0.03, y - 0.002, zv - 0.024), V(s * w * 0.62, y - 0.008, zv - 0.036), V(s * w, y - dr * 0.42, zm - 0.012)];
      const floating = i >= 10;
      if (!floating) pts.push(V(s * w * 0.82, y - dr * 0.78, zm + (zf - zm) * 0.72), V(s * w * 0.5, y - dr, zf));
      else pts.push(V(s * w * 0.9, y - dr, zm + 0.012));
      ribs.push(
        loft(pts, {
          radial: 8,
          tubular: 40,
          section: (t) => ({ w: 0.0017 + 0.0007 * t, h: (i === 0 ? 0.0065 : 0.0038 + 0.0022 * smoothstep(0, 0.35, t)) * (floating ? 1 - t * 0.5 : 1) }),
          thinAxis: (_t, p) => V(p.x, 0, p.z),
        })
      );
      if (!floating) {
        const end = pts[pts.length - 1];
        let target: Vector3;
        if (i < 7) target = V(s * 0.016, stY[i], stZ(stY[i]));
        else target = margin[i - 7].clone().setX(s * margin[i - 7].x);
        const mid = end.clone().lerp(target, 0.5).add(V(0, 0.01, 0.004));
        cart.push(loft([end, mid, target], { radial: 7, section: () => ({ w: 0.0024, h: 0.0042 }), thinAxis: (_t, p) => V(p.x, 0, p.z) }));
      }
    }
  }
  for (const s of [-1, 1] as Side[]) {
    cart.push(loft([V(s * 0.016, 0.31, 0.101), V(s * 0.03, 0.302, 0.104), V(s * 0.052, 0.285, 0.1), V(s * 0.074, 0.27, 0.094)], { radial: 6, section: () => ({ w: 0.0026, h: 0.004 }) }));
  }
  // Sternum (manubrium, body, xiphoid)
  ribs.push(
    loft([V(0, 0.476, 0.07), V(0, 0.448, 0.076), V(0, 0.425, 0.081), V(0, 0.37, 0.091), V(0, 0.31, 0.1)], {
      radial: 12,
      section: (t) => ({ w: 0.0058, h: sampleProfile([[0, 0.022], [0.15, 0.028], [0.32, 0.015], [0.6, 0.017], [0.88, 0.019], [1, 0.012]], t)[0] }),
      thinAxis: () => V(0, 0, 1),
    })
  );
  cart.push(loft([V(0, 0.31, 0.1), V(0, 0.29, 0.101), V(0, 0.268, 0.098)], { radial: 8, section: (t) => ({ w: 0.0022, h: 0.0075 * (1 - t * 0.7) }), thinAxis: () => V(0, 0, 1) }));
  const ribcageGroup = new Group();
  root.add(ribcageGroup);
  add(ribcageGroup, ribs, 'ribcage-sternum', 'bone', 'skeleton');
  add(ribcageGroup, cart, 'ribcage-sternum', 'cartilage', 'skeleton');

  // Shoulder girdle: clavicles, scapulae (spine, acromion, coracoid, glenoid)
  const girdle: BufferGeometry[] = [];
  for (const s of [-1, 1] as Side[]) {
    girdle.push(
      loft([V(s * 0.02, 0.476, 0.071), V(s * 0.06, 0.486, 0.071), V(s * 0.11, 0.496, 0.046), V(s * 0.145, 0.503, 0.012), V(s * 0.167, 0.506, -0.01)], {
        radial: 10,
        section: (t) => ({ w: 0.0062 - t * 0.0015, h: 0.0068 + t * 0.003 }),
        thinAxis: () => V(0, 1, 0),
      })
    );
    const SA = V(s * 0.062, 0.475, -0.104);
    const IA = V(s * 0.092, 0.3, -0.1);
    const LA = V(s * 0.152, 0.448, -0.06);
    girdle.push(
      thickSurface(
        (u, v) => {
          const med = SA.clone().lerp(IA, u);
          const lat = LA.clone().lerp(IA.clone().add(V(s * 0.008, 0.006, 0)), Math.pow(u, 0.75));
          const p = med.lerp(lat, v);
          p.z -= 0.009 * Math.sin(Math.PI * v) * (1 - u * 0.5);
          return p;
        },
        14,
        8,
        (_u, v) => 0.0035 + 0.004 * smoothstep(0.75, 1, v)
      )
    );
    girdle.push(loft([V(s * 0.066, 0.436, -0.108), V(s * 0.11, 0.456, -0.105), V(s * 0.15, 0.48, -0.084), V(s * 0.174, 0.5, -0.046), V(s * 0.18, 0.503, -0.02)], { radial: 8, section: (t) => ({ w: 0.003 + t * 0.002, h: 0.004 + t * 0.006 }) }));
    girdle.push(place(sculptSphere(0.006, 0.017, 0.012, 12, 10), [s * 0.163, 0.452, -0.042]));
    girdle.push(loft([V(s * 0.145, 0.476, -0.052), V(s * 0.146, 0.483, -0.022), V(s * 0.136, 0.47, 0.004)], { radial: 6, section: (t) => ({ w: 0.0045 - t * 0.0015, h: 0.0045 - t * 0.0015 }) }));
  }
  add(root, girdle, 'clavicle-scapula', 'bone', 'skeleton');

  /* ============================ PELVIS =================================== */
  const pelvis: BufferGeometry[] = [];
  for (const s of [-1, 1] as Side[]) {
    const crest = [V(s * 0.035, 0.085, -0.075), V(s * 0.075, 0.13, -0.07), V(s * 0.12, 0.145, -0.035), V(s * 0.14, 0.135, 0.0), V(s * 0.125, 0.1, 0.045)];
    const base = [V(s * 0.045, 0.045, -0.07), V(s * 0.07, 0.03, -0.045), V(s * 0.085, 0.03, -0.015), V(s * 0.09, 0.035, 0.015), V(s * 0.098, 0.05, 0.04)];
    const interp = (arr: Vector3[], u: number) => {
      const k = sampleProfile(arr.map((p, i) => [i / (arr.length - 1), p.x, p.y, p.z]), u);
      return V(k[0], k[1], k[2]);
    };
    pelvis.push(
      thickSurface(
        (u, v) => {
          const p = interp(base, u).lerp(interp(crest, u), v);
          p.x += s * 0.012 * Math.sin(Math.PI * v) * Math.sin(Math.PI * u);
          return p;
        },
        16,
        10,
        (_u, v) => 0.0045 + 0.006 * Math.pow(v, 6)
      )
    );
    pelvis.push(loft(crest, { radial: 8, section: (t) => ({ w: 0.0045 + 0.0015 * Math.sin(Math.PI * t), h: 0.0055 }) }));
    // acetabulum rim + body
    const A = V(s * 0.086, 0.0, 0.008);
    const n = V(s * 0.75, -0.35, 0.55).normalize();
    const e1 = new Vector3().crossVectors(n, V(0, 1, 0)).normalize();
    const e2 = new Vector3().crossVectors(n, e1).normalize();
    const rim: Vector3[] = [];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      rim.push(A.clone().addScaledVector(e1, Math.cos(a) * 0.026).addScaledVector(e2, Math.sin(a) * 0.026));
    }
    pelvis.push(loft(rim, { closed: true, radial: 8, tubular: 48, section: () => ({ w: 0.0055, h: 0.0065 }) }));
    pelvis.push(place(sculptSphere(0.022, 0.024, 0.022, 16, 12), A.clone().add(V(-s * 0.012, 0.012, -0.008))));
    // pubic & ischial rami around the obturator foramen
    pelvis.push(
      loft([V(s * 0.075, -0.012, 0.035), V(s * 0.045, -0.022, 0.06), V(s * 0.015, -0.032, 0.068), V(s * 0.012, -0.06, 0.06), V(s * 0.035, -0.08, 0.035), V(s * 0.06, -0.09, -0.005), V(s * 0.075, -0.055, -0.025), V(s * 0.085, -0.02, -0.01)], {
        closed: true,
        radial: 8,
        tubular: 56,
        section: (t) => ({ w: 0.0068 + 0.004 * Math.exp(-Math.pow((t - 0.62) / 0.08, 2)), h: 0.0085 }),
      })
    );
  }
  add(root, pelvis, 'pelvic-girdle', 'bone', 'skeleton');

  /* ============================ ORGANS =================================== */
  const heartGroup = new Group();
  heartGroup.position.set(0.022, 0.33, 0.035);
  root.add(heartGroup);
  const heart: BufferGeometry[] = [];
  heart.push(
    place(
      sculptSphere(0.042, 0.055, 0.038, 40, 32, (u, o) => {
        const apex = smoothstep(0.0, -1.0, u.y);
        o.x *= 1 - 0.55 * apex;
        o.z *= 1 - 0.5 * apex;
        if (u.y < -0.7) o.y -= 0.006;
        const groove = Math.exp(-Math.pow((u.x - 0.15 * u.y) / 0.08, 2)) * Math.max(0, u.z);
        o.addScaledVector(u, -groove * 0.003);
      }),
      [0, 0, 0],
      [-0.25, 0, 0.62]
    )
  );
  heart.push(place(sculptSphere(0.02, 0.022, 0.02, 18, 14), [-0.03, 0.028, 0.004]));
  heart.push(place(sculptSphere(0.014, 0.012, 0.016, 14, 10), [0.03, 0.03, 0.018]));
  const aorta = loft([V(-0.006, 0.03, 0.01), V(-0.012, 0.07, 0.008), V(-0.004, 0.092, -0.012), V(0.01, 0.088, -0.045), V(0.012, 0.05, -0.075), V(0.008, -0.08, -0.08), V(0.0, -0.2, -0.07), V(-0.004, -0.25, -0.055)], {
    radial: 12,
    tubular: 80,
    section: (t) => ({ w: 0.012 - t * 0.003, h: 0.012 - t * 0.003 }),
  });
  heart.push(aorta);
  // arch branches
  for (const [x, z] of [
    [-0.012, 0.0],
    [-0.002, -0.012],
    [0.006, -0.022],
  ]) {
    heart.push(loft([V(x, 0.09, z), V(x * 1.6, 0.13, z + 0.004), V(x * 2.4 - 0.004, 0.18, z + 0.01)], { radial: 6, section: () => ({ w: 0.0042, h: 0.0042 }) }));
  }
  heart.push(loft([V(0.012, 0.03, 0.032), V(0.02, 0.06, 0.024), V(0.024, 0.075, 0.0), V(0.05, 0.072, -0.012)], { radial: 10, section: () => ({ w: 0.0095, h: 0.0095 }) }));
  heart.push(loft([V(0.022, 0.074, 0.0), V(-0.02, 0.07, -0.015), V(-0.055, 0.065, -0.015)], { radial: 8, section: () => ({ w: 0.007, h: 0.007 }) }));
  heart.push(loft([V(-0.028, 0.12, -0.002), V(-0.03, 0.06, 0.004), V(-0.03, 0.035, 0.006)], { radial: 8, section: () => ({ w: 0.0085, h: 0.0085 }) }));
  heart.push(loft([V(-0.028, -0.02, -0.01), V(-0.03, -0.1, -0.04), V(-0.025, -0.25, -0.05)], { radial: 8, section: () => ({ w: 0.0095, h: 0.0095 }) }));
  for (const g of heart) if (g.attributes.uv) g.deleteAttribute('uv');
  add(heartGroup, heart, 'heart', 'organ', 'organs');

  const lungsGroup = new Group();
  root.add(lungsGroup);
  const lungs: BufferGeometry[] = [];
  for (const s of [-1, 1] as Side[]) {
    lungs.push(
      place(
        sculptSphere(0.058, 0.1, 0.075, 48, 40, (u, o) => {
          if (u.y > 0) {
            const k = u.y;
            o.x *= 1 - 0.5 * k * k;
            o.z *= 1 - 0.42 * k * k;
          } else {
            o.y *= 0.82;
            const dome = 1 - (u.x * u.x + u.z * u.z);
            if (u.y < -0.55) o.y += dome * 0.026;
          }
          if (u.x * s < -0.3) {
            o.x *= 0.72;
            if (s > 0 && u.z > -0.1 && u.y < 0.2) o.x += s * 0.012 * smoothstep(-0.1, 0.6, u.z);
          }
          const fiss = Math.abs(u.y - (0.45 - 0.9 * (u.z * 0.5 + 0.5)));
          if (fiss < 0.04) o.multiplyScalar(0.985);
          o.addScaledVector(u, (ridged(o, 330) - 0.5) * 0.0016);
        }),
        [s * 0.07, 0.36, 0.0]
      )
    );
  }
  add(lungsGroup, lungs, 'lungs', 'lung', 'organs');
  const airway: BufferGeometry[] = [];
  airway.push(loft([V(0, 0.56, 0.036), V(0, 0.49, 0.03), V(0, 0.425, 0.012)], { radial: 12, section: () => ({ w: 0.0085, h: 0.0085 }) }));
  for (let k = 0; k < 11; k++) {
    const y = 0.552 - k * 0.012;
    const z = 0.036 - k * 0.002;
    const r = new CylinderGeometry(0.0098, 0.0098, 0.004, 16, 1, true);
    r.deleteAttribute('uv');
    airway.push(place(r, [0, y, z], [0.12, 0, 0]));
  }
  airway.push(place(sculptSphere(0.019, 0.016, 0.012, 16, 12, (u, o) => { if (u.z > 0.3) o.z += 0.004 * u.z; }), [0, 0.548, 0.046]));
  const branch = (from: Vector3, to: Vector3, r: number, depth: number) => {
    airway.push(loft([from, from.clone().lerp(to, 0.5).add(V(0, 0.004, 0)), to], { radial: 6, section: (t) => ({ w: r * (1 - t * 0.3), h: r * (1 - t * 0.3) }) }));
    if (depth <= 0) return;
    const d = new Vector3().subVectors(to, from).normalize();
    const side = new Vector3().crossVectors(d, V(0, 0, 1)).normalize();
    for (const sg of [-1, 1]) {
      const nd = d.clone().addScaledVector(side, sg * 0.6).add(V(0, -0.35, (sg * 0.15))).normalize();
      branch(to, to.clone().addScaledVector(nd, 0.03 + depth * 0.008), r * 0.68, depth - 1);
    }
  };
  for (const s of [-1, 1] as Side[]) branch(V(0, 0.425, 0.012), V(s * 0.045, 0.395, 0.0), 0.0058, 2);
  add(lungsGroup, airway, 'lungs', 'cartilage', 'organs');

  // Diaphragm dome (very faint), liver, gallbladder, stomach, spleen, pancreas, kidneys, gut, bladder
  const abd: Record<string, BufferGeometry[]> = { liver: [], stomach: [], kidneys: [], intestines: [] };
  abd.liver.push(
    place(
      sculptSphere(0.1, 0.055, 0.068, 40, 28, (u, o) => {
        const leftTaper = smoothstep(-0.2, 1.0, u.x);
        o.y *= 1 - 0.65 * leftTaper;
        o.z *= 1 - 0.3 * leftTaper;
        if (u.y < 0) o.y *= 0.55;
        if (u.y > 0) o.y += 0.008 * (1 - u.x * u.x);
      }),
      [-0.035, 0.255, 0.018],
      [0, 0, 0.18]
    )
  );
  abd.liver.push(place(sculptSphere(0.011, 0.02, 0.011, 12, 10), [-0.055, 0.215, 0.062], [0.5, 0, 0.3]));
  abd.stomach.push(loft([V(0.008, 0.31, -0.012), V(0.018, 0.29, -0.012)], { radial: 8, section: () => ({ w: 0.006, h: 0.006 }) }));
  abd.stomach.push(
    loft([V(0.018, 0.29, -0.012), V(0.05, 0.3, 0.0), V(0.072, 0.262, 0.025), V(0.066, 0.212, 0.05), V(0.032, 0.188, 0.06), V(0.0, 0.195, 0.055), V(-0.024, 0.206, 0.045)], {
      radial: 16,
      tubular: 60,
      section: (t) => {
        const r = sampleProfile([[0, 0.012], [0.15, 0.03], [0.4, 0.033], [0.7, 0.024], [0.9, 0.015], [1, 0.009]], t)[0];
        return { w: r, h: r };
      },
    })
  );
  abd.stomach.push(place(sculptSphere(0.022, 0.05, 0.016, 16, 12), [0.098, 0.255, -0.04], [0, 0, -0.35]));
  abd.stomach.push(loft([V(-0.02, 0.198, 0.018), V(0.03, 0.205, 0.0), V(0.08, 0.218, -0.02)], { radial: 8, section: (t) => ({ w: 0.009 - t * 0.004, h: 0.007 - t * 0.003 }) }));
  for (const s of [-1, 1] as Side[]) {
    const ky = s < 0 ? 0.158 : 0.172;
    abd.kidneys.push(
      place(
        sculptSphere(0.022, 0.05, 0.019, 24, 20, (u, o) => {
          if (u.x * s < -0.5 && Math.abs(u.y) < 0.35) o.x += s * 0.008 * (1 - Math.abs(u.y) / 0.35);
        }),
        [s * 0.055, ky, -0.045],
        [0, 0, s * -0.18]
      )
    );
    abd.kidneys.push(loft([V(s * 0.045, ky - 0.01, -0.042), V(s * 0.04, 0.08, -0.03), V(s * 0.035, 0.0, 0.0), V(s * 0.016, -0.03, 0.03)], { radial: 5, section: () => ({ w: 0.0022, h: 0.0022 }) }));
  }
  abd.kidneys.push(place(sculptSphere(0.026, 0.022, 0.024, 18, 14), [0, -0.035, 0.04]));
  // colon with haustra
  abd.intestines.push(
    loft([V(-0.07, 0.03, 0.03), V(-0.085, 0.1, 0.02), V(-0.085, 0.17, 0.03), V(-0.06, 0.185, 0.05), V(0, 0.14, 0.075), V(0.06, 0.175, 0.045), V(0.09, 0.2, 0.02), V(0.095, 0.12, 0.012), V(0.088, 0.04, 0.015), V(0.05, 0.015, 0.035), V(0.015, 0.0, 0.0), V(0.0, -0.03, -0.035), V(0.0, -0.06, -0.045)], {
      radial: 12,
      tubular: 220,
      section: (t) => {
        const base = t < 0.8 ? 0.021 - t * 0.006 : 0.012;
        const h = t < 0.75 ? 1 + 0.18 * Math.max(0, Math.sin(t * 130)) : 1;
        return { w: base * h, h: base * h };
      },
    })
  );
  // small intestine coils (deterministic meander inside the colon frame)
  const coil: Vector3[] = [];
  const rows = 7;
  for (let r = 0; r < rows; r++) {
    const y = 0.14 - r * 0.017;
    for (let k = 0; k <= 10; k++) {
      const f = r % 2 === 0 ? k / 10 : 1 - k / 10;
      const x = -0.055 + f * 0.11;
      coil.push(V(x + Math.sin(k * 1.7 + r) * 0.006, y + Math.sin(k * 2.3 + r * 0.7) * 0.007, 0.045 + Math.sin(k * 1.1 + r * 1.3) * 0.018));
    }
  }
  abd.intestines.push(loft(coil, { radial: 8, tubular: 420, section: () => ({ w: 0.0095, h: 0.0095 }) }));
  for (const [id, geos] of Object.entries(abd)) {
    for (const g of geos) if (g.attributes.uv) g.deleteAttribute('uv');
    add(root, geos, id, 'organ', 'organs');
  }
  const esoph = [loft([V(0, 0.56, 0.018), V(0, 0.45, -0.005), V(0.006, 0.36, -0.02), V(0.012, 0.31, -0.014)], { radial: 8, section: () => ({ w: 0.0055, h: 0.0045 }) })];
  add(root, esoph, 'stomach', 'organ', 'organs');
  const diaphragm = [
    thickSurface(
      (u, v) => {
        const a = u * Math.PI * 2;
        const r = v;
        const x = Math.cos(a) * r * 0.135;
        const z = Math.sin(a) * r * 0.1 - 0.005;
        const dome = (1 - r * r) * 0.05 + (x < 0 ? 0.006 : 0) * (1 - r);
        return V(x, 0.255 + dome, z);
      },
      28,
      6,
      () => 0.002
    ),
  ];
  add(root, diaphragm, 'lungs', 'lung', 'organs');

  /* ============================ TRUNK MUSCLES ============================ */
  const trunk: BufferGeometry[] = [];
  for (const s of [-1, 1] as Side[]) {
    const orig = [V(s * 0.12, 0.49, 0.056), V(s * 0.06, 0.483, 0.086), V(s * 0.022, 0.45, 0.098), V(s * 0.022, 0.38, 0.112), V(s * 0.04, 0.316, 0.119), V(s * 0.09, 0.306, 0.112)];
    const oi = (u: number) => {
      const k = sampleProfile(orig.map((p, i) => [i / (orig.length - 1), p.x, p.y, p.z]), u);
      return V(k[0], k[1], k[2]);
    };
    trunk.push(
      thickSurface(
        (u, v) => {
          const ins = V(s * 0.178, 0.4 + 0.016 * (1 - u), 0.022);
          const p = oi(u).lerp(ins, Math.pow(v, 1.15));
          p.z += 0.013 * Math.sin(Math.PI * v) * (1 - 0.3 * u);
          return p;
        },
        14,
        10,
        (_u, v) => 0.011 * (1 - v * 0.55)
      )
    );
    // deltoid cap
    const S = shoulderJoint(s);
    trunk.push(
      thickSurface(
        (u, v) => {
          const a = -1.4 + u * 2.8;
          const el = v * 1.25;
          return V(S.x + s * Math.sin(el) * 0.05 * (0.85 + 0.15 * Math.cos(a)), S.y + 0.045 - (1 - Math.cos(el)) * 0.07 - v * 0.05, S.z + Math.sin(a) * 0.045 * Math.sin(el + 0.4));
        },
        14,
        10,
        (_u, v) => 0.014 * (1 - v * 0.6)
      )
    );
    // rectus abdominis with tendinous intersections
    trunk.push(
      thickSurface(
        (u, v) => {
          const x = s * (0.007 + u * (0.045 + 0.012 * v));
          const y = -0.03 + v * 0.36;
          const z = 0.066 + 0.03 * Math.sin(Math.PI * Math.min(1, v * 1.05)) + (1 - u) * 0.004;
          return V(x, y, z);
        },
        6,
        22,
        (_u, v) => 0.0095 * (0.55 + 0.45 * Math.abs(Math.sin((v - 0.48) * Math.PI * 4.2)))
      )
    );
    // external oblique
    trunk.push(
      thickSurface(
        (u, v) => {
          const phi = 0.55 + u * 1.0;
          const y = 0.1 + v * 0.18;
          const wx = 0.138 + 0.012 * Math.sin(Math.PI * v);
          return V(s * Math.sin(phi) * wx, y, Math.cos(phi) * 0.098 - 0.006);
        },
        10,
        10,
        () => 0.007
      )
    );
    // trapezius
    trunk.push(
      thickSurface(
        (u, v) => {
          const w = sampleProfile([[0, 0.012], [0.45, 0.17], [0.72, 0.075], [1, 0.03]], v)[0];
          const y = 0.24 + v * 0.4;
          const x = s * u * w;
          const z = (v < 0.75 ? -0.112 : -0.112 + (v - 0.75) * 0.22) - 0.008 * Math.sin(Math.PI * u);
          return V(x, y, z);
        },
        8,
        20,
        () => 0.0075
      )
    );
    // latissimus dorsi
    trunk.push(
      thickSurface(
        (u, v) => {
          const x = s * u * (0.05 + 0.085 * v);
          const y = 0.1 + v * 0.3;
          const z = -0.088 - 0.012 * Math.sin(Math.PI * v) + u * 0.03 * v;
          return V(x, y, z);
        },
        8,
        14,
        () => 0.006
      )
    );
    // gluteus maximus
    trunk.push(place(sculptSphere(0.062, 0.075, 0.045, 24, 18, (u, o) => { if (u.z > 0.2) o.z *= 0.4; }), [s * 0.072, -0.01, -0.07], [0.2, 0, s * -0.25]));
    // sternocleidomastoid
    trunk.push(loft([V(s * 0.05, 0.662, -0.035), V(s * 0.035, 0.57, 0.02), V(s * 0.016, 0.478, 0.073)], { radial: 8, section: (t) => ({ w: 0.0065, h: 0.009 + 0.003 * Math.sin(Math.PI * t) }) }));
  }
  add(root, trunk, 'trunk-muscles', 'muscle', 'muscles');

  /* ============================ TORSO SKIN =============================== */
  const torsoKeys = [
    [-0.075, 0.15, 0.1, -0.01],
    [0.0, 0.172, 0.112, -0.012],
    [0.06, 0.158, 0.104, -0.008],
    [0.13, 0.134, 0.094, 0.0],
    [0.22, 0.14, 0.1, 0.0],
    [0.3, 0.152, 0.11, 0.0],
    [0.37, 0.165, 0.118, 0.0],
    [0.43, 0.18, 0.112, -0.012],
    [0.48, 0.195, 0.088, -0.022],
    [0.51, 0.125, 0.072, -0.02],
    [0.545, 0.062, 0.058, -0.008],
    [0.6, 0.052, 0.054, 0.0],
    [0.64, 0.05, 0.052, 0.006],
  ];
  const torsoPts = torsoKeys.map((k) => V(0, k[0], k[3]));
  addSkin(root, [
    loft(torsoPts, {
      radial: 32,
      tubular: 90,
      caps: false,
      section: (t) => {
        const y = torsoKeys[0][0] + t * (torsoKeys[torsoKeys.length - 1][0] - torsoKeys[0][0]);
        const keys = torsoKeys.map((k) => [k[0], k[1], k[2]]);
        const [w, h] = sampleProfile(keys, y);
        return { w, h, power: 2.35 };
      },
      thinAxis: () => V(1, 0, 0),
    }),
  ]);

  /* ============================ LIMBS ==================================== */
  const nodes = { root, head: headPivot, jaw: jawPivot } as unknown as Record<AttachKey, Object3D>;
  const segRest: Record<SegmentKey, number> = {} as Record<SegmentKey, number>;

  const makeSegment = (key: SegmentKey, len: number): Group => {
    const g = new Group();
    g.name = key;
    root.add(g);
    nodes[key] = g;
    segRest[key] = len;
    return g;
  };

  const fusiform = (a: Vector3, mid: Vector3, b: Vector3, r0: number, r1: number, r2: number) =>
    loft([a, mid, b], {
      radial: 10,
      tubular: 18,
      section: (t) => {
        const r = sampleProfile([[0, r0], [0.5, r1], [1, r2]], t)[0];
        return { w: r, h: r * 1.05 };
      },
    });

  const limbSkin = (len: number, keys: number[][], extend = [0.02, 0.01]) => {
    const pts: Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const [, , , oz] = [0, 0, 0, sampleProfile(keys, t)[2] ?? 0];
      pts.push(V(0, len / 2 + extend[0] - t * (len + extend[0] + extend[1]), oz));
    }
    return loft(pts, {
      radial: 20,
      tubular: 36,
      caps: false,
      section: (t) => {
        const [rx, rz] = sampleProfile(keys, t);
        return { w: rx, h: rz };
      },
      thinAxis: () => V(1, 0, 0),
    });
  };

  for (const s of [-1, 1] as Side[]) {
    const k = sideKey(s);
    /* ---- upper arm ---- */
    const ua = makeSegment(`upperArm-${k}` as SegmentKey, UPPER_ARM);
    const L = UPPER_ARM;
    const hum: BufferGeometry[] = [];
    hum.push(place(sculptSphere(0.022, 0.022, 0.021, 20, 16), [-s * 0.004, L / 2, -0.004]));
    hum.push(place(sculptSphere(0.011, 0.012, 0.011, 12, 10), [s * 0.016, L / 2 - 0.006, 0.004]));
    hum.push(place(sculptSphere(0.007, 0.008, 0.007, 10, 8), [0, L / 2 - 0.012, 0.014]));
    hum.push(
      place(
        straightBone(L - 0.055, [
          [0, 0.016, 0.016],
          [0.12, 0.0115, 0.0115],
          [0.6, 0.0105, 0.0105],
          [0.88, 0.016, 0.009],
          [1, 0.025, 0.0105],
        ]),
        [s * 0.001, -0.0075, -0.002]
      )
    );
    hum.push(place(sculptSphere(0.005, 0.012, 0.005, 8, 8), [s * 0.0115, L / 2 - 0.11, 0.002]));
    hum.push(place(sculptSphere(0.009, 0.008, 0.008, 10, 8), [-s * 0.029, -L / 2 + 0.016, -0.002]));
    hum.push(place(sculptSphere(0.007, 0.008, 0.008, 10, 8), [s * 0.024, -L / 2 + 0.017, 0]));
    hum.push(place(sculptSphere(0.012, 0.011, 0.011, 14, 10), [-s * 0.008, -L / 2 + 0.004, 0.003]));
    hum.push(place(sculptSphere(0.009, 0.009, 0.009, 12, 10), [s * 0.012, -L / 2 + 0.006, 0.006]));
    add(ua, hum, 'humerus', 'bone', 'skeleton');
    add(ua, [
      fusiform(V(0, L / 2 - 0.035, 0.014), V(0, -0.01, 0.026), V(0, -L / 2 + 0.04, 0.012), 0.006, 0.019, 0.006),
      fusiform(V(0, L / 2 - 0.02, -0.014), V(0, 0.0, -0.026), V(0, -L / 2 + 0.025, -0.02), 0.009, 0.021, 0.008),
    ], 'arm-muscles', 'muscle', 'muscles');
    addSkin(ua, [limbSkin(L, [[0, 0.05, 0.048, 0], [0.25, 0.044, 0.044, 0], [0.55, 0.042, 0.044, 0.003], [0.88, 0.035, 0.033, 0], [1, 0.034, 0.032, 0]], [0.03, 0.012])]);

    /* ---- forearm ---- */
    const fa = makeSegment(`forearm-${k}` as SegmentKey, FOREARM);
    const F = FOREARM;
    const fore: BufferGeometry[] = [];
    fore.push(place(sculptSphere(0.011, 0.016, 0.011, 14, 12), [-s * 0.01, F / 2 + 0.01, -0.012]));
    fore.push(place(sculptSphere(0.006, 0.006, 0.006, 8, 6), [-s * 0.008, F / 2 - 0.008, 0.006]));
    fore.push(loft([V(-s * 0.01, F / 2 - 0.004, -0.005), V(-s * 0.013, 0, -0.002), V(-s * 0.016, -F / 2 + 0.012, 0)], { radial: 10, section: (t) => { const r = sampleProfile([[0, 0.0095], [0.5, 0.0065], [1, 0.0045]], t)[0]; return { w: r, h: r }; } }));
    fore.push(place(new SphereGeometry(0.0065, 10, 8), [-s * 0.016, -F / 2 + 0.008, 0]));
    const rh = new CylinderGeometry(0.0105, 0.0105, 0.009, 16);
    fore.push(place(rh, [s * 0.012, F / 2 - 0.004, 0.004]));
    fore.push(loft([V(s * 0.012, F / 2 - 0.01, 0.004), V(s * 0.02, 0, 0.006), V(s * 0.017, -F / 2 + 0.02, 0.002)], { radial: 10, section: (t) => { const r = sampleProfile([[0, 0.006], [0.5, 0.0075], [1, 0.011]], t)[0]; return { w: r, h: r * 0.85 }; } }));
    fore.push(place(sculptSphere(0.017, 0.009, 0.011, 14, 10), [s * 0.014, -F / 2 + 0.006, 0.001]));
    fore.push(place(sculptSphere(0.004, 0.007, 0.004, 8, 6), [s * 0.03, -F / 2 + 0.001, 0]));
    for (const g of fore) if (g.attributes.uv) g.deleteAttribute('uv');
    add(fa, fore, 'radius-ulna', 'bone', 'skeleton');
    add(fa, [
      fusiform(V(-s * 0.012, F / 2 - 0.005, 0.01), V(-s * 0.013, F / 2 - 0.075, 0.016), V(-s * 0.008, -F / 2 + 0.04, 0.008), 0.008, 0.019, 0.005),
      fusiform(V(s * 0.012, F / 2 + 0.03, 0.0), V(s * 0.019, F / 2 - 0.06, 0.004), V(s * 0.015, -F / 2 + 0.05, 0.0), 0.008, 0.017, 0.005),
    ], 'arm-muscles', 'muscle', 'muscles');
    addSkin(fa, [limbSkin(F, [[0, 0.036, 0.034, 0], [0.25, 0.039, 0.034, 0], [0.6, 0.031, 0.024, 0], [1, 0.029, 0.019, 0]], [0.01, 0.012])]);

    /* ---- thigh ---- */
    const th = makeSegment(`thigh-${k}` as SegmentKey, THIGH);
    const T = THIGH;
    const fem: BufferGeometry[] = [];
    fem.push(place(new SphereGeometry(0.024, 22, 18), [0, T / 2, 0.003]));
    fem.push(loft([V(0, T / 2, 0.004), V(s * 0.02, T / 2 - 0.018, 0.002), V(s * 0.038, T / 2 - 0.035, -0.002)], { radial: 12, section: (t) => { const r = sampleProfile([[0, 0.014], [0.5, 0.0125], [1, 0.017]], t)[0]; return { w: r, h: r * 1.15 }; } }));
    fem.push(place(sculptSphere(0.014, 0.02, 0.017, 14, 12), [s * 0.05, T / 2 - 0.03, -0.006]));
    fem.push(place(sculptSphere(0.008, 0.009, 0.008, 10, 8), [s * 0.018, T / 2 - 0.075, -0.012]));
    fem.push(
      loft([V(s * 0.04, T / 2 - 0.04, -0.004), V(s * 0.021, 0, 0.008), V(0, -T / 2 + 0.03, 0)], {
        radial: 14,
        tubular: 30,
        section: (t) => {
          const [rx, rz] = sampleProfile([[0, 0.017, 0.016], [0.1, 0.0145, 0.0135], [0.5, 0.0128, 0.0125], [0.82, 0.016, 0.0145], [1, 0.03, 0.021]], t);
          return { w: rx, h: rz };
        },
        thinAxis: () => V(1, 0, 0),
      })
    );
    fem.push(place(sculptSphere(0.019, 0.02, 0.026, 16, 14), [-s * 0.022, -T / 2 + 0.012, -0.004]));
    fem.push(place(sculptSphere(0.018, 0.019, 0.025, 16, 14), [s * 0.02, -T / 2 + 0.014, -0.002]));
    fem.push(place(sculptSphere(0.02, 0.022, 0.009, 14, 12, (u, o) => { if (u.y < 0) o.x *= 1 + u.y * 0.35; }), [0, -T / 2 + 0.035, 0.034]));
    for (const g of fem) if (g.attributes.uv) g.deleteAttribute('uv');
    add(th, fem, 'femur-patella', 'bone', 'skeleton');
    add(th, [
      fusiform(V(0, T / 2 - 0.04, 0.035), V(0, 0, 0.046), V(0, -T / 2 + 0.05, 0.036), 0.011, 0.026, 0.01),
      fusiform(V(s * 0.035, T / 2 - 0.06, 0.008), V(s * 0.046, -0.02, 0.012), V(s * 0.03, -T / 2 + 0.06, 0.02), 0.013, 0.029, 0.011),
      fusiform(V(-s * 0.025, -0.04, 0.02), V(-s * 0.036, -T / 2 + 0.11, 0.026), V(-s * 0.026, -T / 2 + 0.05, 0.028), 0.01, 0.024, 0.011),
      fusiform(V(0, T / 2 - 0.05, -0.04), V(0, -0.02, -0.05), V(0, -T / 2 + 0.04, -0.034), 0.014, 0.031, 0.011),
      fusiform(V(-s * 0.035, T / 2 - 0.03, -0.005), V(-s * 0.042, 0.05, 0.0), V(-s * 0.02, -0.12, 0.0), 0.018, 0.029, 0.008),
    ], 'leg-muscles', 'muscle', 'muscles');
    addSkin(th, [limbSkin(T, [[0, 0.088, 0.085, -0.004], [0.3, 0.078, 0.074, 0], [0.7, 0.06, 0.058, 0.004], [1, 0.05, 0.05, 0.008]], [0.04, 0.012])]);

    /* ---- shank ---- */
    const sh = makeSegment(`shank-${k}` as SegmentKey, SHANK);
    const Sh = SHANK;
    const tib: BufferGeometry[] = [];
    tib.push(place(sculptSphere(0.036, 0.011, 0.026, 22, 12, (u, o) => { if (u.y > 0.3) o.y = 0.011 * 0.3 + (o.y - 0.0033) * 0.3; }), [0, Sh / 2 - 0.009, -0.002]));
    tib.push(place(sculptSphere(0.009, 0.012, 0.007, 10, 8), [0, Sh / 2 - 0.05, 0.022]));
    tib.push(
      straightBone(Sh - 0.03, [
        [0, 0.026, 0.021, 0, 0],
        [0.12, 0.016, 0.017, 0, 0.002],
        [0.5, 0.011, 0.013, 0, 0.002],
        [0.85, 0.014, 0.014, 0, 0],
        [1, 0.02, 0.017, 0, 0],
      ]).translate(0, -0.006, 0)
    );
    tib.push(place(sculptSphere(0.007, 0.012, 0.008, 10, 8), [-s * 0.019, -Sh / 2 + 0.002, 0.002]));
    tib.push(place(new SphereGeometry(0.0085, 10, 8), [s * 0.026, Sh / 2 - 0.03, -0.014]));
    tib.push(loft([V(s * 0.026, Sh / 2 - 0.035, -0.014), V(s * 0.024, 0, -0.012), V(s * 0.026, -Sh / 2 + 0.01, -0.006)], { radial: 8, section: (t) => { const r = sampleProfile([[0, 0.0055], [0.5, 0.0045], [1, 0.006]], t)[0]; return { w: r, h: r }; } }));
    tib.push(place(sculptSphere(0.007, 0.014, 0.009, 10, 8), [s * 0.027, -Sh / 2 - 0.006, -0.006]));
    for (const g of tib) if (g.attributes.uv) g.deleteAttribute('uv');
    add(sh, tib, 'tibia-fibula', 'bone', 'skeleton');
    add(sh, [
      fusiform(V(0.015, Sh / 2 - 0.02, -0.03), V(0.016, Sh / 2 - 0.12, -0.046), V(0, -0.05, -0.032), 0.008, 0.021, 0.006),
      fusiform(V(-0.015, Sh / 2 - 0.02, -0.03), V(-0.018, Sh / 2 - 0.115, -0.047), V(0, -0.05, -0.032), 0.008, 0.023, 0.006),
      fusiform(V(0, Sh / 2 - 0.12, -0.028), V(0, -0.08, -0.034), V(0, -Sh / 2 + 0.03, -0.03), 0.018, 0.024, 0.004),
      fusiform(V(s * 0.015, Sh / 2 - 0.04, 0.018), V(s * 0.017, 0, 0.02), V(0, -Sh / 2 + 0.03, 0.016), 0.008, 0.014, 0.004),
    ], 'leg-muscles', 'muscle', 'muscles');
    addSkin(sh, [limbSkin(Sh, [[0, 0.05, 0.05, 0.004], [0.28, 0.056, 0.06, -0.01], [0.75, 0.036, 0.035, 0], [1, 0.033, 0.03, 0]], [0.01, 0.015])]);

    /* ---- foot (rig-aligned, positioned at the ankle) ---- */
    const foot = new Group();
    foot.name = `foot-${k}`;
    root.add(foot);
    nodes[`foot-${k}` as AttachKey] = foot;
    const fb: BufferGeometry[] = [];
    fb.push(place(sculptSphere(0.017, 0.013, 0.022, 14, 12), [0, -0.012, 0.008]));
    fb.push(place(sculptSphere(0.017, 0.02, 0.038, 18, 14, (u, o) => { if (u.z < -0.5 && u.y < 0) o.y -= 0.004; }), [0, -0.04, -0.018]));
    fb.push(place(sculptSphere(0.012, 0.009, 0.007, 10, 8), [-s * 0.01, -0.025, 0.035]));
    fb.push(place(sculptSphere(0.011, 0.01, 0.014, 10, 8), [s * 0.016, -0.045, 0.035]));
    for (const cx of [-0.016, -0.003, 0.008]) fb.push(place(sculptSphere(0.007, 0.009, 0.008, 8, 8), [s * cx, -0.032, 0.053]));
    const mb = [-0.018, -0.006, 0.004, 0.013, 0.021];
    const mh = [-0.028, -0.011, 0.003, 0.016, 0.028];
    const mz = [0.135, 0.14, 0.135, 0.128, 0.118];
    const my = [-0.04, -0.036, -0.038, -0.042, -0.05];
    for (let r = 0; r < 5; r++) {
      const base = V(s * mb[r], my[r], 0.062);
      const head = V(s * mh[r], -0.06, mz[r]);
      const rr = r === 0 ? 0.0075 : 0.0048;
      fb.push(loft([base, base.clone().lerp(head, 0.5).add(V(0, 0.004, 0)), head], { radial: 8, section: (t) => ({ w: rr * (1 - 0.25 * Math.sin(Math.PI * t)), h: rr * (1 - 0.25 * Math.sin(Math.PI * t)) }) }));
      const lens = r === 0 ? [0.028, 0.022] : [0.022, 0.012, 0.01];
      let p = head.clone();
      lens.forEach((ln, j) => {
        const q = p.clone().add(V(0, -0.002 - j * 0.001, ln));
        fb.push(loft([p, q], { radial: 6, section: () => ({ w: rr * (0.8 - j * 0.12), h: rr * (0.75 - j * 0.12) }) }));
        p = q;
      });
    }
    for (const g of fb) if (g.attributes.uv) g.deleteAttribute('uv');
    add(foot, fb, 'foot-skeleton', 'bone', 'skeleton');
    addSkin(foot, [
      loft([V(0, -0.04, -0.06), V(0, -0.03, -0.01), V(0, -0.042, 0.075), V(0, -0.054, 0.165)], {
        radial: 16,
        tubular: 30,
        section: (t) => {
          const [w, h] = sampleProfile([[0, 0.028, 0.03], [0.3, 0.034, 0.04], [0.65, 0.046, 0.022], [1, 0.04, 0.012]], t);
          return { w, h };
        },
        thinAxis: () => V(1, 0, 0),
      }),
    ]);
    foot.rotation.y = s * 0.12;
  }

  for (const mesh of [...layerMeshes.skeleton, ...layerMeshes.organs, ...layerMeshes.muscles, ...layerMeshes.skin]) {
    (mesh.userData.basePos as Vector3).copy(mesh.position);
  }

  /* ============================ POSE ===================================== */
  const wristLocal: [Vector3, Vector3] = [V(-0.27, -0.088, -0.015), V(0.27, -0.088, -0.015)];
  const forearmDirLocal: [Vector3, Vector3] = [V(0, -1, 0), V(0, -1, 0)];
  const restElbow = (s: Side) => shoulderJoint(s).add(V(s * 0.12, -1, 0).normalize().multiplyScalar(UPPER_ARM));
  const restWrist = (s: Side) => restElbow(s).add(V(s * 0.18, -1, 0.07).normalize().multiplyScalar(FOREARM));
  const restKnee = (s: Side) => V(s * 0.09, -THIGH, 0.012);
  const restAnkle = (s: Side) => V(s * 0.088, -THIGH - SHANK, -0.005);

  const updatePose = (pose: BodyPose | null, t: number) => {
    const breath = Math.sin(t * 1.45);
    if (pose?.head) headPivot.rotation.set(pose.head.x, pose.head.y, pose.head.z, 'YXZ');
    for (const s of [-1, 1] as Side[]) {
      const i = s < 0 ? 0 : 1;
      const k = sideKey(s);
      const S = shoulderJoint(s).add(V(0, breath * 0.002, 0));
      let E: Vector3;
      let W: Vector3;
      const eT = pose?.elbow?.[i];
      const wT = pose?.wrist?.[i];
      if (eT && wT) {
        E = S.clone().add(eT.clone().sub(S).normalize().multiplyScalar(UPPER_ARM));
        W = E.clone().add(wT.clone().sub(eT).normalize().multiplyScalar(FOREARM));
      } else if (wT) {
        E = solveTwoBone(S, wT, UPPER_ARM, FOREARM, V(s * 0.4, -0.3, -1));
        W = E.clone().add(wT.clone().sub(E).normalize().multiplyScalar(FOREARM));
      } else {
        const sway = Math.sin(t * 0.9 + s) * 0.004;
        E = restElbow(s).add(V(0, 0, sway));
        W = restWrist(s).add(V(0, 0, sway * 2));
      }
      orientSegment(nodes[`upperArm-${k}` as SegmentKey], S, E, UPPER_ARM);
      orientSegment(nodes[`forearm-${k}` as SegmentKey], E, W, FOREARM);
      wristLocal[i].copy(W);
      forearmDirLocal[i].subVectors(W, E).normalize();

      const Hj = hipJoint(s);
      const kT = pose?.knee?.[i];
      const aT = pose?.ankle?.[i];
      let Kn = restKnee(s);
      let An = restAnkle(s);
      if (kT) {
        Kn = Hj.clone().add(kT.clone().sub(Hj).normalize().multiplyScalar(THIGH));
        An = aT ? Kn.clone().add(aT.clone().sub(kT).normalize().multiplyScalar(SHANK)) : Kn.clone().add(V(0, -SHANK, 0));
      }
      orientSegment(nodes[`thigh-${k}` as SegmentKey], Hj, Kn, THIGH);
      orientSegment(nodes[`shank-${k}` as SegmentKey], Kn, An, SHANK);
      nodes[`foot-${k}` as AttachKey].position.copy(An);
    }
  };

  const rig: BodyRig = {
    root,
    headPivot,
    jawPivot,
    nodes,
    layerMeshes,
    materialsByStructure,
    allMaterials,
    wristLocal,
    forearmDirLocal,
    setJawOpen(open01: number) {
      const c = Math.min(1, Math.max(0, open01));
      jawPivot.rotation.x = c * 0.42;
      jawPivot.position.set(0, 0.065 - c * 0.003, 0.015 + c * 0.006);
    },
    updatePhysiology(t: number) {
      const ph = (t * 1.2) % 1;
      const beat = Math.exp(-Math.pow((ph - 0.12) * 14, 2)) * 0.06 + Math.exp(-Math.pow((ph - 0.3) * 18, 2)) * 0.03;
      heartGroup.scale.set(1 - beat * 0.5 + beat, 1 + beat * 0.6, 1 + beat);
      const br = 0.5 + 0.5 * Math.sin(t * 1.45);
      lungsGroup.scale.set(1 + br * 0.035, 1 + br * 0.03, 1 + br * 0.045);
      lungsGroup.position.y = -0.36 * br * 0.03;
      ribcageGroup.scale.set(1 + br * 0.014, 1, 1 + br * 0.02);
      ribcageGroup.position.set(0, 0.002 * br, -0.003 * br);
    },
    updatePose,
    setExploded(f: number) {
      const e = Math.min(1, Math.max(0, f));
      const off: Record<LayerKey, Vector3> = {
        skeleton: V(0, 0, 0),
        skin: V(0, 0, 0),
        organs: V(-0.46 * e, 0, 0.02 * e),
        muscles: V(0.46 * e, 0, 0.02 * e),
      };
      for (const layer of Object.keys(layerMeshes) as LayerKey[]) {
        for (const m of layerMeshes[layer]) {
          m.position.copy(m.userData.basePos as Vector3).add(off[layer]);
        }
      }
    },
    setLookMode(solid: boolean) {
      for (const m of allMaterials) m.userData.syncLook?.(solid);
    },
    setLayerVisibility(layers: Record<LayerKey, boolean>) {
      for (const layer of Object.keys(layerMeshes) as LayerKey[]) {
        for (const m of layerMeshes[layer]) m.visible = layers[layer];
      }
    },
    highlightStructure(id: string | null) {
      materialsByStructure.forEach((mats, sid) => {
        const v = sid === id ? 1 : 0;
        for (const m of mats) m.uniforms.uHighlight.value = v;
      });
    },
  };

  updatePose(null, 0);
  return rig;
}

/* ============================== HANDS ===================================== */

export const XR_HAND_JOINTS: readonly string[] = [
  'wrist',
  'thumb-metacarpal',
  'thumb-phalanx-proximal',
  'thumb-phalanx-distal',
  'thumb-tip',
  'index-finger-metacarpal',
  'index-finger-phalanx-proximal',
  'index-finger-phalanx-intermediate',
  'index-finger-phalanx-distal',
  'index-finger-tip',
  'middle-finger-metacarpal',
  'middle-finger-phalanx-proximal',
  'middle-finger-phalanx-intermediate',
  'middle-finger-phalanx-distal',
  'middle-finger-tip',
  'ring-finger-metacarpal',
  'ring-finger-phalanx-proximal',
  'ring-finger-phalanx-intermediate',
  'ring-finger-phalanx-distal',
  'ring-finger-tip',
  'pinky-finger-metacarpal',
  'pinky-finger-phalanx-proximal',
  'pinky-finger-phalanx-intermediate',
  'pinky-finger-phalanx-distal',
  'pinky-finger-tip',
];

const HAND_BONES: Array<[string, string, number]> = [
  ['thumb-metacarpal', 'thumb-phalanx-proximal', 0.0058],
  ['thumb-phalanx-proximal', 'thumb-phalanx-distal', 0.005],
  ['thumb-phalanx-distal', 'thumb-tip', 0.0042],
  ['index-finger-metacarpal', 'index-finger-phalanx-proximal', 0.0052],
  ['index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 0.0048],
  ['index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 0.0041],
  ['index-finger-phalanx-distal', 'index-finger-tip', 0.0035],
  ['middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 0.0054],
  ['middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 0.005],
  ['middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 0.0042],
  ['middle-finger-phalanx-distal', 'middle-finger-tip', 0.0036],
  ['ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 0.005],
  ['ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 0.0046],
  ['ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 0.0039],
  ['ring-finger-phalanx-distal', 'ring-finger-tip', 0.0034],
  ['pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 0.0046],
  ['pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 0.004],
  ['pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 0.0034],
  ['pinky-finger-phalanx-distal', 'pinky-finger-tip', 0.003],
  // metacarpal shafts from the carpus
  ['wrist', 'thumb-metacarpal', 0.0055],
  ['wrist', 'index-finger-metacarpal', 0.0042],
  ['wrist', 'middle-finger-metacarpal', 0.0044],
  ['wrist', 'ring-finger-metacarpal', 0.004],
  ['wrist', 'pinky-finger-metacarpal', 0.0038],
];

export interface HandRig {
  root: Group;
  bones: InstancedMesh;
  joints: InstancedMesh;
  outline: InstancedMesh;
  carpus: Mesh;
  allMaterials: ShaderMaterial[];
  update(joints: ReadonlyMap<string, Vector3>, showBones: boolean, showSkin: boolean): void;
  setLookMode(solid: boolean): void;
  highlight(on: boolean): void;
}

function phalanxGeometry(): BufferGeometry {
  // unit length along +Y (0..1), radius ~1 with condylar flare at both ends
  const g = straightBone(1, [
    [0, 1.25, 1.05],
    [0.12, 0.85, 0.75],
    [0.5, 0.7, 0.62],
    [0.88, 0.9, 0.75],
    [1, 1.15, 0.95],
  ], 10, 12);
  g.translate(0, 0.5, 0);
  g.rotateZ(Math.PI); // proximal at y=0, distal at y=+1 after flip
  g.translate(0, 1, 0);
  return g;
}

export function buildHandRig(shared: SharedXRayUniforms): HandRig {
  const root = new Group();
  const boneMat = createTissueMaterial(shared, 'bone');
  const skinMat = createTissueMaterial(shared, 'skin');
  skinMat.depthFunc = LessEqualDepth;
  const n = HAND_BONES.length;
  const bones = new InstancedMesh(phalanxGeometry(), boneMat, n);
  bones.instanceMatrix.setUsage(DynamicDrawUsage);
  bones.userData.structureId = 'hand-skeleton';
  bones.renderOrder = 42;
  const jg = new SphereGeometry(1, 10, 8);
  jg.deleteAttribute('uv');
  const joints = new InstancedMesh(jg, boneMat, XR_HAND_JOINTS.length);
  joints.instanceMatrix.setUsage(DynamicDrawUsage);
  joints.userData.structureId = 'hand-skeleton';
  joints.renderOrder = 42;
  const og = new CylinderGeometry(1, 1, 1, 10, 1, true);
  og.deleteAttribute('uv');
  og.translate(0, 0.5, 0);
  const outline = new InstancedMesh(og, skinMat, n);
  outline.instanceMatrix.setUsage(DynamicDrawUsage);
  outline.renderOrder = 102;
  outline.raycast = () => {};

  const carpGeos: BufferGeometry[] = [];
  const carpals: Array<[number, number, number, number]> = [
    [-0.012, 0.012, 0.0, 0.0068],
    [-0.002, 0.013, 0.0, 0.0064],
    [0.008, 0.012, 0.0, 0.006],
    [0.013, 0.012, 0.006, 0.0045],
    [-0.014, 0.024, 0.002, 0.006],
    [-0.006, 0.025, 0.002, 0.0055],
    [0.002, 0.024, 0.0, 0.0072],
    [0.011, 0.023, 0.0, 0.0065],
  ];
  for (const [x, y, z, r] of carpals) carpGeos.push(place(sculptSphere(r * 1.1, r * 0.85, r * 0.9, 10, 8), [x, y, z]));
  const carpus = new Mesh(mergeGeos(carpGeos), boneMat);
  carpus.userData.structureId = 'hand-skeleton';
  carpus.renderOrder = 42;
  root.add(bones, joints, outline, carpus);

  const m = new Matrix4();
  const q = new Quaternion();
  const sc = new Vector3();
  const dir = new Vector3();
  const up = new Vector3(0, 1, 0);
  const zero = new Matrix4().makeScale(0, 0, 0);
  const fx = new Vector3();
  const fy = new Vector3();
  const fz = new Vector3();

  return {
    root,
    bones,
    joints,
    outline,
    carpus,
    allMaterials: [boneMat, skinMat],
    update(jm, showBones, showSkin) {
      const wrist = jm.get('wrist');
      const mid = jm.get('middle-finger-metacarpal');
      if (!wrist || !mid) {
        root.visible = false;
        return;
      }
      root.visible = showBones || showSkin;
      bones.visible = showBones;
      joints.visible = showBones;
      carpus.visible = showBones;
      outline.visible = showSkin;
      HAND_BONES.forEach(([a, b, r], i) => {
        const pa = jm.get(a);
        const pb = jm.get(b);
        if (!pa || !pb) {
          bones.setMatrixAt(i, zero);
          outline.setMatrixAt(i, zero);
          return;
        }
        dir.subVectors(pb, pa);
        const len = dir.length();
        if (len < 1e-5) {
          bones.setMatrixAt(i, zero);
          outline.setMatrixAt(i, zero);
          return;
        }
        q.setFromUnitVectors(up, dir.divideScalar(len));
        sc.set(r, len, r);
        m.compose(pa, q, sc);
        bones.setMatrixAt(i, m);
        sc.set(r * 1.85, len, r * 1.85);
        m.compose(pa, q, sc);
        outline.setMatrixAt(i, m);
      });
      XR_HAND_JOINTS.forEach((name, i) => {
        const p = jm.get(name);
        if (!p || name === 'wrist') {
          joints.setMatrixAt(i, zero);
          return;
        }
        const r = name.endsWith('-tip') ? 0.0034 : name.includes('metacarpal') ? 0.0058 : 0.0048;
        m.compose(p, q.identity(), sc.set(r, r, r));
        joints.setMatrixAt(i, m);
      });
      bones.instanceMatrix.needsUpdate = true;
      joints.instanceMatrix.needsUpdate = true;
      outline.instanceMatrix.needsUpdate = true;
      bones.computeBoundingSphere();
      joints.computeBoundingSphere();
      // carpus frame: y toward fingers, z out of the palm-ish
      fy.subVectors(mid, wrist).normalize();
      const idx = jm.get('index-finger-metacarpal') ?? mid;
      const pnk = jm.get('pinky-finger-metacarpal') ?? mid;
      fx.subVectors(idx, pnk).normalize();
      fz.crossVectors(fx, fy).normalize();
      fx.crossVectors(fy, fz).normalize();
      m.makeBasis(fx, fy, fz);
      carpus.quaternion.setFromRotationMatrix(m);
      carpus.position.copy(wrist);
    },
    setLookMode(solid) {
      boneMat.userData.syncLook?.(solid);
    },
    highlight(on) {
      boneMat.uniforms.uHighlight.value = on ? 1 : 0;
    },
  };
}

/**
 * Procedural relaxed hand (anatomical position: palm facing `palmDir`, thumb lateral).
 * side: -1 for the viewer-left hand, +1 for the viewer-right hand.
 */
export function proceduralHand(
  side: Side,
  wrist: Vector3,
  down: Vector3,
  palmDir: Vector3,
  t: number,
  out: Map<string, Vector3>,
  scale = 1
): void {
  const y = down.clone().normalize().negate(); // proximal
  const z = palmDir.clone().addScaledVector(y, -palmDir.dot(y)).normalize();
  const x = new Vector3().crossVectors(y, z).normalize();
  const set = (name: string, lx: number, ly: number, lz: number) => {
    let v = out.get(name);
    if (!v) {
      v = new Vector3();
      out.set(name, v);
    }
    v.copy(wrist)
      .addScaledVector(x, lx * scale)
      .addScaledVector(y, ly * scale)
      .addScaledVector(z, lz * scale);
  };
  set('wrist', 0, 0, 0);
  const fingers: Array<[string, number, number, number[]]> = [
    ['index-finger', 0.021, 0.068, [0.04, 0.024, 0.018]],
    ['middle-finger', 0.004, 0.072, [0.044, 0.027, 0.019]],
    ['ring-finger', -0.013, 0.068, [0.041, 0.026, 0.018]],
    ['pinky-finger', -0.028, 0.06, [0.033, 0.019, 0.016]],
  ];
  fingers.forEach(([name, fx0, metaLen, lens], fi) => {
    const lx = side * fx0;
    const curl = 0.22 + 0.05 * Math.sin(t * 1.3 + fi * 0.6) + fi * 0.05;
    set(`${name}-metacarpal`, lx * 0.6, -metaLen * 0.45, 0.0);
    let py = -metaLen;
    let pz = 0;
    set(`${name}-phalanx-proximal`, lx, py, pz);
    const names = ['phalanx-intermediate', 'phalanx-distal', 'tip'];
    let ang = 0;
    lens.forEach((ln, j) => {
      ang += curl * (j === 0 ? 0.7 : 1.1);
      py -= ln * Math.cos(ang);
      pz += ln * Math.sin(ang);
      set(`${name}-${names[j]}`, lx * (1.04 + j * 0.02), py, pz);
    });
  });
  set('thumb-metacarpal', side * 0.022, -0.022, 0.012);
  set('thumb-phalanx-proximal', side * 0.038, -0.05, 0.022);
  set('thumb-phalanx-distal', side * 0.044, -0.077, 0.028);
  set('thumb-tip', side * 0.046, -0.097, 0.031);
}
