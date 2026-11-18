import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
} from '@iwsdk/core';

/**
 * Geometry toolkit for sculpting anatomically shaped meshes procedurally:
 * - loft(): sweeps an elliptical / super-elliptical section along a smooth spline (long bones, ribs, vessels, gut)
 * - thickSurface(): turns a parametric (u,v) surface into a solid plate (scapula, ilium, sternum, diaphragm)
 * - sculptSphere(): deforms an ellipsoid with a callback (skull, organs, condyles)
 * - mergeGeos(): merges static pieces into one draw call per structure
 */

export const V = (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z);

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** Smoothly samples a keyed profile [[t, c0, c1, ...], ...] (keys sorted by t). */
export function sampleProfile(keys: number[][], t: number): number[] {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (i < n - 2 && t > keys[i + 1][0]) i++;
  const k0 = keys[Math.max(0, i - 1)];
  const k1 = keys[i];
  const k2 = keys[i + 1];
  const k3 = keys[Math.min(n - 1, i + 2)];
  const u = (t - k1[0]) / Math.max(1e-6, k2[0] - k1[0]);
  const out: number[] = [];
  for (let c = 1; c < k1.length; c++) {
    out.push(catmull(k0[c], k1[c], k2[c], k3[c], u));
  }
  return out;
}

export interface LoftSection {
  /** half-size along the "thin" axis (B) */
  w: number;
  /** half-size along the wide axis (N = B x T) */
  h: number;
  /** super-ellipse exponent (2 = ellipse, >2 boxier) */
  power?: number;
}

export interface LoftOptions {
  radial?: number;
  tubular?: number;
  closed?: boolean;
  caps?: boolean;
  section: (t: number) => LoftSection;
  /** approximate direction of the thin (w) axis at t; default = horizontal side vector */
  thinAxis?: (t: number, p: Vector3, tangent: Vector3) => Vector3;
}

export function loft(points: Vector3[], opts: LoftOptions): BufferGeometry {
  const radial = opts.radial ?? 12;
  const tubular = opts.tubular ?? Math.max(8, points.length * 6);
  const closed = opts.closed ?? false;
  const caps = opts.caps ?? !closed;
  const curve = new CatmullRomCurve3(points, closed, 'centripetal', 0.5);

  const ringCount = closed ? tubular : tubular + 1;
  const positions: number[] = [];
  const indices: number[] = [];
  const up = new Vector3(0, 1, 0);
  const fwd = new Vector3(0, 0, 1);
  let prevB = new Vector3(1, 0, 0);

  for (let i = 0; i < ringCount; i++) {
    const t = i / tubular;
    const p = curve.getPointAt(t);
    const T = curve.getTangentAt(t).normalize();
    let b: Vector3;
    if (opts.thinAxis) {
      b = opts.thinAxis(t, p, T).clone();
    } else {
      const ref = Math.abs(T.dot(up)) > 0.92 ? fwd : up;
      b = new Vector3().crossVectors(T, ref);
    }
    b.addScaledVector(T, -b.dot(T));
    if (b.lengthSq() < 1e-8) b.copy(prevB);
    b.normalize();
    if (i > 0 && b.dot(prevB) < 0 && !opts.thinAxis) b.negate();
    prevB = b.clone();
    const N = new Vector3().crossVectors(b, T).normalize();
    const s = opts.section(t);
    const pw = s.power ?? 2;
    for (let j = 0; j < radial; j++) {
      const th = (j / radial) * Math.PI * 2;
      let c = Math.cos(th);
      let sn = Math.sin(th);
      if (pw !== 2) {
        c = Math.sign(c) * Math.pow(Math.abs(c), 2 / pw);
        sn = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / pw);
      }
      positions.push(
        p.x + b.x * s.w * c + N.x * s.h * sn,
        p.y + b.y * s.w * c + N.y * s.h * sn,
        p.z + b.z * s.w * c + N.z * s.h * sn
      );
    }
  }

  const segs = closed ? ringCount : ringCount - 1;
  for (let i = 0; i < segs; i++) {
    const i2 = (i + 1) % ringCount;
    for (let j = 0; j < radial; j++) {
      const j2 = (j + 1) % radial;
      const a = i * radial + j;
      const b = i2 * radial + j;
      const c = i * radial + j2;
      const d = i2 * radial + j2;
      indices.push(a, b, c, b, d, c);
    }
  }

  if (caps) {
    const startCenter = curve.getPointAt(0);
    const endCenter = curve.getPointAt(1);
    const sIdx = positions.length / 3;
    positions.push(startCenter.x, startCenter.y, startCenter.z);
    const eIdx = sIdx + 1;
    positions.push(endCenter.x, endCenter.y, endCenter.z);
    const lastRing = (ringCount - 1) * radial;
    for (let j = 0; j < radial; j++) {
      const j2 = (j + 1) % radial;
      indices.push(sIdx, j2, j);
      indices.push(eIdx, lastRing + j, lastRing + j2);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Straight bone along local Y. y = +L/2 is the proximal end (t = 0), y = -L/2 distal (t = 1).
 * profile keys: [t, rx, rz, ox, oz]  (ox/oz offset the section centre, e.g. bowing)
 */
export function straightBone(length: number, profile: number[][], radial = 14, tubular = 28): BufferGeometry {
  const pts: Vector3[] = [];
  const sections: LoftSection[] = [];
  const n = tubular;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [rx, rz, ox = 0, oz = 0] = sampleProfile(profile, t);
    pts.push(new Vector3(ox, length / 2 - t * length, oz));
    sections.push({ w: Math.max(0.0005, rx), h: Math.max(0.0005, rz) });
  }
  return loft(pts, {
    radial,
    tubular: n,
    section: (t) => sections[Math.min(n, Math.round(t * n))],
    thinAxis: () => new Vector3(1, 0, 0),
  });
}

/** Ellipsoid sculpted by a callback receiving the unit-sphere direction and the scaled point to edit. */
export function sculptSphere(
  rx: number,
  ry: number,
  rz: number,
  widthSegs: number,
  heightSegs: number,
  fn?: (unit: Vector3, out: Vector3) => void
): BufferGeometry {
  const geo = new SphereGeometry(1, widthSegs, heightSegs);
  geo.deleteAttribute('uv');
  const pos = geo.attributes.position;
  const unit = new Vector3();
  const out = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    unit.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    out.set(unit.x * rx, unit.y * ry, unit.z * rz);
    if (fn) fn(unit, out);
    pos.setXYZ(i, out.x, out.y, out.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Solid plate from a parametric surface, with per-(u,v) thickness. */
export function thickSurface(
  fn: (u: number, v: number) => Vector3,
  nu: number,
  nv: number,
  thickness: (u: number, v: number) => number
): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const e = 1e-3;
  const cols = nu + 1;
  const rows = nv + 1;
  const front: Vector3[] = [];
  const back: Vector3[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const u = i / nu;
      const v = j / nv;
      const p = fn(u, v);
      const du = fn(Math.min(1, u + e), v).sub(fn(Math.max(0, u - e), v));
      const dv = fn(u, Math.min(1, v + e)).sub(fn(u, Math.max(0, v - e)));
      const n = new Vector3().crossVectors(du, dv);
      if (n.lengthSq() < 1e-12) n.set(0, 0, 1);
      n.normalize();
      const th = thickness(u, v) / 2;
      front.push(p.clone().addScaledVector(n, th));
      back.push(p.clone().addScaledVector(n, -th));
    }
  }
  for (const p of front) positions.push(p.x, p.y, p.z);
  for (const p of back) positions.push(p.x, p.y, p.z);
  const off = cols * rows;
  const idx = (i: number, j: number) => j * cols + i;
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = idx(i, j);
      const b = idx(i + 1, j);
      const c = idx(i, j + 1);
      const d = idx(i + 1, j + 1);
      indices.push(a, b, c, b, d, c);
      indices.push(off + a, off + c, off + b, off + b, off + c, off + d);
    }
  }
  const edge = (a: number, b: number) => {
    indices.push(a, off + a, b, b, off + a, off + b);
  };
  for (let i = 0; i < nu; i++) {
    edge(idx(i + 1, 0), idx(i, 0));
    edge(idx(i, nv), idx(i + 1, nv));
  }
  for (let j = 0; j < nv; j++) {
    edge(idx(0, j), idx(0, j + 1));
    edge(idx(nu, j + 1), idx(nu, j));
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function place(
  geo: BufferGeometry,
  pos: [number, number, number] | Vector3,
  rot?: [number, number, number],
  scale?: [number, number, number] | number
): BufferGeometry {
  const m = new Matrix4();
  const q = new Quaternion();
  if (rot) q.setFromEuler(new Euler(rot[0], rot[1], rot[2], 'XYZ'));
  const s =
    scale === undefined
      ? new Vector3(1, 1, 1)
      : typeof scale === 'number'
      ? new Vector3(scale, scale, scale)
      : new Vector3(scale[0], scale[1], scale[2]);
  const p = pos instanceof Vector3 ? pos : new Vector3(pos[0], pos[1], pos[2]);
  m.compose(p, q, s);
  geo.applyMatrix4(m);
  return geo;
}

/** Orients a geometry so its local +Y aligns with `dir`, then translates to `at`. */
export function alignY(geo: BufferGeometry, dir: Vector3, at: Vector3): BufferGeometry {
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize());
  geo.applyQuaternion(q);
  geo.translate(at.x, at.y, at.z);
  return geo;
}

export function mergeGeos(list: BufferGeometry[]): BufferGeometry {
  let vCount = 0;
  let iCount = 0;
  for (const g of list) {
    if (!g.attributes.normal) g.computeVertexNormals();
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : g.attributes.position.count;
  }
  const positions = new Float32Array(vCount * 3);
  const normals = new Float32Array(vCount * 3);
  const indices = new Uint32Array(iCount);
  let vOff = 0;
  let iOff = 0;
  for (const g of list) {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    for (let k = 0; k < p.count; k++) {
      positions[(vOff + k) * 3] = p.getX(k);
      positions[(vOff + k) * 3 + 1] = p.getY(k);
      positions[(vOff + k) * 3 + 2] = p.getZ(k);
      normals[(vOff + k) * 3] = n.getX(k);
      normals[(vOff + k) * 3 + 1] = n.getY(k);
      normals[(vOff + k) * 3 + 2] = n.getZ(k);
    }
    if (g.index) {
      for (let k = 0; k < g.index.count; k++) indices[iOff + k] = g.index.getX(k) + vOff;
      iOff += g.index.count;
    } else {
      for (let k = 0; k < p.count; k++) indices[iOff + k] = k + vOff;
      iOff += p.count;
    }
    vOff += p.count;
    g.dispose();
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(positions, 3));
  out.setAttribute('normal', new BufferAttribute(normals, 3));
  out.setIndex(new BufferAttribute(indices, 1));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

/** Ridged pseudo-noise used for cortical gyri, lung texture etc. Deterministic & cheap. */
export function ridged(p: Vector3, freq: number): number {
  const dirs = [
    [0.82, 0.31, 0.48],
    [-0.27, 0.91, 0.31],
    [0.44, -0.36, 0.82],
    [-0.71, -0.18, 0.68],
  ];
  let acc = 0;
  for (let k = 0; k < dirs.length; k++) {
    const d = dirs[k];
    const f = freq * (1 + k * 0.37);
    const s = Math.sin((p.x * d[0] + p.y * d[1] + p.z * d[2]) * f + k * 1.7);
    const s2 = Math.sin((p.x * d[2] - p.y * d[0] + p.z * d[1]) * f * 0.63 + k);
    acc += 1 - Math.abs(s * 0.7 + s2 * 0.3);
  }
  return acc / dirs.length;
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
