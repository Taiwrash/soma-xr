import type { FaceLandmarker, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { Euler, PerspectiveCamera, Vector3 } from '@iwsdk/core';
import type { BodyPose } from '../anatomy/proceduralAnatomyBuilder';
import { OneEuroFilter, OneEuroVec3Filter } from '../utils/oneEuroFilter';

export interface WebcamTrackingSnapshot {
  active: boolean;
  poseDetected: boolean;
  faceDetected: boolean;
  landmarkSummary: string;
  rootWorld: Vector3;
  bodyScale: number;
  headEuler: Euler;
  distanceCm: number;
  jawOpen01: number;
  pose: BodyPose;
  /** [viewer-left, viewer-right] hand joints in world space */
  hands: [Map<string, Vector3>, Map<string, Vector3>];
  primaryTip: Vector3 | null;
  primaryTipNorm: [number, number] | null;
}

const CHAINS: Array<{ prefix: string; idx: [number, number, number, number]; thumb?: boolean }> = [
  { prefix: 'thumb', idx: [1, 2, 3, 4], thumb: true },
  { prefix: 'index-finger', idx: [5, 6, 7, 8] },
  { prefix: 'middle-finger', idx: [9, 10, 11, 12] },
  { prefix: 'ring-finger', idx: [13, 14, 15, 16] },
  { prefix: 'pinky-finger', idx: [17, 18, 19, 20] },
];

export class WebcamMediaPipeTracker {
  private pose: PoseLandmarker | null = null;
  private face: FaceLandmarker | null = null;
  private hand: HandLandmarker | null = null;
  private stream: MediaStream | null = null;
  private lastVideoTime = -1;
  public isRunning = false;
  public isInitializing = false;
  public statusMessage = 'Webcam idle';

  private rootF = new OneEuroVec3Filter(1.2, 0.04);
  private scaleF = new OneEuroFilter(0.8, 0.02);
  private yawF = new OneEuroFilter(1.4, 0.05);
  private pitchF = new OneEuroFilter(1.4, 0.05);
  private rollF = new OneEuroFilter(1.4, 0.05);
  private jawF = new OneEuroFilter(2.2, 0.08);
  private jointF = new Map<string, OneEuroVec3Filter>();

  public readonly snapshot: WebcamTrackingSnapshot = {
    active: false,
    poseDetected: false,
    faceDetected: false,
    landmarkSummary: 'idle',
    rootWorld: new Vector3(0, 0.92, -2.4),
    bodyScale: 1,
    headEuler: new Euler(0, 0, 0, 'YXZ'),
    distanceCm: 0,
    jawOpen01: 0,
    pose: {},
    hands: [new Map(), new Map()],
    primaryTip: null,
    primaryTipNorm: null,
  };

  constructor(private video: HTMLVideoElement) { }

  async start(): Promise<boolean> {
    if (this.isRunning) return true;
    if (this.isInitializing) return false;
    this.isInitializing = true;
    this.statusMessage = 'Loading pose, face and hand models…';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
      this.video.srcObject = this.stream;
      await this.video.play();
      this.video.classList.add('is-active');
      const { FaceLandmarker: FaceCls, FilesetResolver, HandLandmarker: HandCls, PoseLandmarker: PoseCls } = await import('@mediapipe/tasks-vision');
      const rawBase = import.meta.env.BASE_URL || './';
      const appBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
      const modelBase = 'https://storage.googleapis.com/mediapipe-models';
      const loadModels = async (wasmRoot: string) => {
        const vision = await FilesetResolver.forVisionTasks(wasmRoot);
        return Promise.all([
          PoseCls.createFromOptions(vision, { baseOptions: { modelAssetPath: `${modelBase}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`, delegate: 'GPU' }, runningMode: 'VIDEO', numPoses: 1 }),
          FaceCls.createFromOptions(vision, { baseOptions: { modelAssetPath: `${modelBase}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`, delegate: 'GPU' }, outputFaceBlendshapes: true, runningMode: 'VIDEO', numFaces: 1 }),
          HandCls.createFromOptions(vision, { baseOptions: { modelAssetPath: `${modelBase}/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 2 }),
        ]);
      };
      let p, f, h;
      try {
        [p, f, h] = await loadModels(`${appBase}mediapipe-wasm`);
      } catch {
        [p, f, h] = await loadModels('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
      }
      this.pose = p;
      this.face = f;
      this.hand = h;
      this.isRunning = true;
      this.snapshot.active = true;
      this.statusMessage = 'Tracking body, face and hands';
      return true;
    } catch (err) {
      this.statusMessage = err instanceof Error ? `Webcam unavailable: ${err.message}` : 'Webcam unavailable';
      this.stop();
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  stop(): void {
    this.isRunning = false;
    this.snapshot.active = false;
    this.video.classList.remove('is-active');
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
  }

  /** Mirrored normalised image coords -> point on a plane `depth` m in front of the camera. */
  private unproject(x: number, y: number, depth: number, cam: PerspectiveCamera, out: Vector3): Vector3 {
    const ndcX = (1 - x) * 2 - 1;
    const ndcY = -(y * 2 - 1);
    const halfH = Math.tan((cam.fov * Math.PI) / 360) * depth;
    const halfW = halfH * cam.aspect;
    return out.set(cam.position.x + ndcX * halfW, cam.position.y + ndcY * halfH, cam.position.z - depth);
  }

  private smooth(key: string, v: Vector3, t: number): Vector3 {
    let f = this.jointF.get(key);
    if (!f) {
      f = new OneEuroVec3Filter(1.6, 0.06);
      this.jointF.set(key, f);
    }
    const o = { x: 0, y: 0, z: 0 };
    f.filter(v.x, v.y, v.z, t, o);
    return v.set(o.x, o.y, o.z);
  }

  update(t: number, cam: PerspectiveCamera, depth: number): WebcamTrackingSnapshot {
    const s = this.snapshot;
    if (!this.isRunning || !this.pose || !this.face || !this.hand || this.video.readyState < 2) return s;
    if (this.video.currentTime === this.lastVideoTime) return s;
    this.lastVideoTime = this.video.currentTime;
    const now = performance.now();

    const pr = this.pose.detectForVideo(this.video, now);
    if (pr.landmarks?.length) {
      const lm = pr.landmarks[0];
      s.poseDetected = true;
      const W = (i: number) => this.unproject(lm[i].x, lm[i].y, depth + lm[i].z * 0.3, cam, new Vector3());
      const shL = W(12); // subject right shoulder appears on the viewer's left
      const shR = W(11);
      const span = shL.distanceTo(shR);
      const scale = this.scaleF.filter(Math.min(2.2, Math.max(0.4, span / 0.37)), t);
      s.bodyScale = scale;
      const spanUV = Math.hypot(lm[11].x - lm[12].x, lm[11].y - lm[12].y);
      s.distanceCm = Math.round(Math.min(400, Math.max(40, 38 / Math.max(0.08, spanUV))));
      const hipsVisible = (lm[23].visibility ?? 0) > 0.5 && (lm[24].visibility ?? 0) > 0.5;
      const rootRaw = hipsVisible ? W(24).add(W(23)).multiplyScalar(0.5) : shL.clone().add(shR).multiplyScalar(0.5).add(new Vector3(0, -0.455 * scale, 0));
      const r = { x: 0, y: 0, z: 0 };
      this.rootF.filter(rootRaw.x, rootRaw.y, depth > 0 ? cam.position.z - depth : rootRaw.z, t, r);
      s.rootWorld.set(r.x, r.y, r.z);
      const local = (i: number, key: string, minVis = 0.4): Vector3 | undefined => {
        if ((lm[i].visibility ?? 1) < minVis) return undefined;
        return this.smooth(key, W(i).sub(s.rootWorld).divideScalar(scale), t);
      };
      s.pose = {
        head: { x: s.headEuler.x, y: s.headEuler.y, z: s.headEuler.z },
        elbow: [local(14, 'eL'), local(13, 'eR')],
        wrist: [local(16, 'wL'), local(15, 'wR')],
        knee: [local(26, 'kL', 0.5), local(25, 'kR', 0.5)],
        ankle: [local(28, 'aL', 0.5), local(27, 'aR', 0.5)],
      };
    } else s.poseDetected = false;

    const fr = this.face.detectForVideo(this.video, now);
    if (fr.faceLandmarks?.length) {
      const lm = fr.faceLandmarks[0];
      s.faceDetected = true;
      const a = lm[234];
      const b = lm[454];
      const top = lm[10];
      const chin = lm[152];
      const dx = (1 - b.x) - (1 - a.x);
      const pitch = this.pitchF.filter(Math.atan2(chin.z - top.z, Math.max(0.05, chin.y - top.y)) * 1.1, t);
      const yaw = this.yawF.filter(Math.atan2(b.z - a.z, Math.max(0.05, Math.abs(dx))) * 1.2, t);
      const roll = this.rollF.filter(Math.atan2(-(b.y - a.y), Math.max(0.05, Math.abs(dx))), t);
      s.headEuler.set(pitch, yaw, roll, 'YXZ');
      if (s.pose) s.pose.head = { x: pitch, y: yaw, z: roll };
      const jaw = fr.faceBlendshapes?.[0]?.categories?.find((c) => c.categoryName === 'jawOpen');
      s.jawOpen01 = this.jawF.filter(jaw ? jaw.score : 0, t);
    } else s.faceDetected = false;

    const hr = this.hand.detectForVideo(this.video, now);
    s.hands[0].clear();
    s.hands[1].clear();
    s.primaryTip = null;
    s.primaryTipNorm = null;
    hr.landmarks?.forEach((hl, h) => {
      // MediaPipe labels assume a mirrored image; on a raw selfie frame "Left" is the subject's right hand -> viewer-left
      const label = hr.handednesses?.[h]?.[0]?.categoryName?.toLowerCase();
      const idx = label === 'left' ? 0 : 1;
      const map = s.hands[idx];
      const pts = hl.map((p) => this.unproject(p.x, p.y, depth - 0.04 + p.z * 0.25, cam, new Vector3()));
      map.set('wrist', pts[0]);
      for (const c of CHAINS) {
        const [a, b, cc, d] = c.idx;
        if (c.thumb) {
          map.set('thumb-metacarpal', pts[a]);
          map.set('thumb-phalanx-proximal', pts[b]);
          map.set('thumb-phalanx-distal', pts[cc]);
          map.set('thumb-tip', pts[d]);
        } else {
          map.set(`${c.prefix}-metacarpal`, pts[0].clone().lerp(pts[a], 0.55));
          map.set(`${c.prefix}-phalanx-proximal`, pts[a]);
          map.set(`${c.prefix}-phalanx-intermediate`, pts[b]);
          map.set(`${c.prefix}-phalanx-distal`, pts[cc]);
          map.set(`${c.prefix}-tip`, pts[d]);
        }
      }
      if (h === 0) {
        s.primaryTip = pts[8].clone();
        s.primaryTipNorm = [Number((1 - hl[8].x).toFixed(2)), Number(hl[8].y.toFixed(2))];
      }
    });

    const parts: string[] = [];
    if (s.poseDetected) parts.push('body');
    if (s.faceDetected) parts.push('face');
    if (hr.landmarks?.length) parts.push(`${hr.landmarks.length} hand${hr.landmarks.length > 1 ? 's' : ''}`);
    s.landmarkSummary = parts.length ? parts.join(' + ') : 'searching…';
    return s;
  }
}
