import {
  BoxGeometry,
  CanvasTexture,
  createSystem,
  Euler,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Plane,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  TwoHandsGrabbable,
  Vector2,
  Vector3,
} from '@iwsdk/core';
import {
  BodyPose,
  BodyRig,
  buildBodyRig,
  buildHandRig,
  createFractureBeacon,
  HandRig,
  proceduralHand,
  Side,
  SOLE_Y,
  XR_HAND_JOINTS,
} from '../anatomy/proceduralAnatomyBuilder';
import { createSharedXRayUniforms, SharedXRayUniforms } from '../shaders/xrayMaterial';
import { SpatialControlConsole3D } from '../spatial/spatialControlPanel3D';
import { SpatialLabelsOverlay, StageRect } from '../spatial/spatialLabelsOverlay';
import { WebcamMediaPipeTracker } from '../tracking/webcamMediaPipeTracker';
import { SpatialAudioAndVoiceEngine } from '../audio/spatialSynth';
import { ANATOMY_STRUCTURES, AnatomyStructureInfo, CLINICAL_CASES, PINPOINT_PROMPTS } from '../data/anatomyCatalog';
import {
  getCoachUIStrings,
  getLocalizedClinicalCase,
  getLocalizedPinpointClue,
  getLocalizedStructure,
} from '../data/multilingualCoaching';
import { applyLayerPreset, appState, notifyStateChanged, savePersistedProgress } from '../state/appState';

export interface XRayMirrorBridge {
  audio: SpatialAudioAndVoiceEngine;
  webcam: WebcamMediaPipeTracker;
  labelsOverlay: SpatialLabelsOverlay;
  recenterMirror: () => void;
  toggleDetachHologram: () => void;
  triggerStructureSelect: (info: AnatomyStructureInfo) => void;
  triggerVoiceOrTextAI: (customPrompt?: string) => void;
  exitXRSession?: () => void;
}

export interface SimulatedMRConfig {
  headPos: [number, number, number];
  lookAt: [number, number, number];
  leftTip: [number, number, number];
  rightTip: [number, number, number];
  palmNormal?: [number, number, number];
  palmPoint?: [number, number, number];
}

let activeBridge: XRayMirrorBridge | null = null;
export function setXRayMirrorBridge(b: XRayMirrorBridge): void {
  activeBridge = b;
}
export function getXRayMirrorBridge(): XRayMirrorBridge | null {
  return activeBridge;
}

const ANCHOR_Z = -2.4;
const ANCHOR_Y = -SOLE_Y; // puts the soles on the world floor (y = 0)
const EYE_Y = 0.7;
const FRAMING: Record<string, { y: number; dist: number }> = {
  full: { y: 0.86, dist: 3.12 },
  torso: { y: 1.24, dist: 1.32 },
  head: { y: 1.58, dist: 0.68 },
};

function isShown(o: Object3D | null): boolean {
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}

function makeFloorShadow(): Mesh {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, 'rgba(12,74,110,0.12)');
  g.addColorStop(0.45, 'rgba(12,74,110,0.05)');
  g.addColorStop(1, 'rgba(12,74,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(3,105,161,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(128, 128, 104, 104, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(3,105,161,0.10)';
  ctx.beginPath();
  ctx.ellipse(128, 128, 118, 118, 0, 0, Math.PI * 2);
  ctx.stroke();
  const tex = new CanvasTexture(c);
  const m = new Mesh(new PlaneGeometry(0.82, 0.82), new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}

export class XRayMirrorSystem extends createSystem() {
  private u!: SharedXRayUniforms;
  private handU!: SharedXRayUniforms;
  private body!: BodyRig;
  private mirrorHands!: [HandRig, HandRig];
  private directHands!: [HandRig, HandRig];
  private ui!: SpatialControlConsole3D;
  private beacon!: Object3D;
  private shadow!: Mesh;

  private anchor = new Group();
  private holder = new Group();
  private detached = new Group();

  private xrJoints: [Map<string, Vector3>, Map<string, Vector3>] = [new Map(), new Map()];
  private mirrorJoints: [Map<string, Vector3>, Map<string, Vector3>] = [new Map(), new Map()];

  private pointer = new Vector2(0, 0.1);
  private dragging = false;
  private dragStart = new Vector2();
  private dragPrev = new Vector2();
  private yaw = 0;
  private yawVel = 0;
  private zoom = 0;
  private raycaster = new Raycaster();
  private hoverTimer = 0;
  private hoverDirty = false;
  private wasXR = false;
  private centeredOnce = false;
  private fpsT = 0;
  private fpsN = 0;
  private uiT = 0;
  private viewKey = '';
  private lastFraming = '';
  private demoJaw: number | null = null;
  private demoPose: BodyPose | null = null;
  private demoLens: Vector3 | null = null;
  private simMR: SimulatedMRConfig | null = null;
  private touchPickCooldown = 0;
  private boundXRSession: XRSession | null = null;

  init(): void {
    this.u = createSharedXRayUniforms();
    this.handU = createSharedXRayUniforms();
    this.renderer.setClearColor(0x000000, 0);
    this.scene.background = null;
    this.camera.position.set(0, FRAMING.full.y + 0.02, ANCHOR_Z + FRAMING.full.dist);
    this.camera.lookAt(0, FRAMING.full.y, ANCHOR_Z);

    this.body = buildBodyRig(this.u);
    this.mirrorHands = [buildHandRig(this.u), buildHandRig(this.u)];
    this.directHands = [buildHandRig(this.handU), buildHandRig(this.handU)];
    const bridge = getXRayMirrorBridge()!;

    this.ui = new SpatialControlConsole3D(bridge.audio, (id) => {
      if (id === 'recenter') this.recenter();
      else if (id === 'toggle-detach') this.toggleDetach();
      else if (id === 'ask-ai') bridge.triggerVoiceOrTextAI();
      else if (id === 'exit-xr') bridge.exitXRSession?.();
      else if (id === 'lang-changed') {
        const sel = ANATOMY_STRUCTURES.find((s) => s.id === appState.selectedStructureId) ?? ANATOMY_STRUCTURES[0];
        const loc = getLocalizedStructure(sel, appState.coachLanguage);
        bridge.audio.speakExplanation(`${loc.name}. ${loc.summary}`);
      }
    });

    this.anchor.position.set(0, ANCHOR_Y, ANCHOR_Z);
    this.holder.add(this.body.root);
    this.shadow = makeFloorShadow();
    this.shadow.position.y = SOLE_Y + 0.002;
    this.anchor.add(this.holder, this.ui.mirrorFrame, this.shadow);
    this.ui.mirrorFrame.visible = false;
    this.beacon = createFractureBeacon();
    this.scene.add(
      this.anchor,
      this.ui.deck,
      this.ui.lensRing,
      this.ui.palmPlane,
      this.beacon,
      ...this.mirrorHands.map((h) => h.root),
      ...this.directHands.map((h) => h.root),
      bridge.labelsOverlay.group3D
    );

    // Detachable room-scale hologram (two-hand grab/scale) with an invisible raycast proxy
    this.detached.position.set(0, ANCHOR_Y, ANCHOR_Z + 0.9);
    const proxy = new Mesh(new BoxGeometry(0.55, 1.8, 0.35), new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    proxy.position.y = -0.05;
    this.detached.add(proxy);
    const ent = this.world.createTransformEntity(this.detached, { persistent: true });
    ent.addComponent(TwoHandsGrabbable, { rotate: true, translate: true, scale: true, scaleMin: [0.3, 0.3, 0.3], scaleMax: [2.5, 2.5, 2.5] });

    bridge.recenterMirror = () => this.recenter();
    bridge.toggleDetachHologram = () => this.toggleDetach();
    this.bindPointer();
    (window as unknown as Record<string, unknown>).__xrayDemoDirector = {
      appState,
      applyLayerPreset,
      notifyStateChanged,
      bridge,
      structures: ANATOMY_STRUCTURES,
      setCameraOrbit: (yaw: number, zoom = 0) => {
        this.yaw = yaw;
        this.yawVel = 0;
        this.zoom = zoom;
      },
      setPointerNDC: (x: number, y: number) => {
        this.pointer.set(x, y);
      },
      setJawOverride: (v: number | null) => {
        this.demoJaw = v;
      },
      setDemoPose: (
        pose: {
          head?: { x: number; y: number; z: number };
          wrist?: [[number, number, number] | null, [number, number, number] | null];
        } | null
      ) => {
        if (!pose) {
          this.demoPose = null;
          return;
        }
        this.demoPose = {
          head: pose.head,
          wrist: pose.wrist
            ? [
                pose.wrist[0] ? new Vector3(pose.wrist[0][0], pose.wrist[0][1], pose.wrist[0][2]) : undefined,
                pose.wrist[1] ? new Vector3(pose.wrist[1][0], pose.wrist[1][1], pose.wrist[1][2]) : undefined,
              ]
            : undefined,
        };
      },
      setDemoLensWorld: (xyz: [number, number, number] | null) => {
        this.demoLens = xyz ? new Vector3(xyz[0], xyz[1], xyz[2]) : null;
      },
      getBeaconWorld: (): [number, number, number] => [this.beacon.position.x, this.beacon.position.y, this.beacon.position.z],
      getDeckButtonWorld: (id: string): [number, number, number] | null => {
        const p = this.ui.getButtonWorldPosition(id);
        return p ? [p.x, p.y, p.z] : null;
      },
      setSimulatedMR: (cfg: SimulatedMRConfig | null) => {
        this.simMR = cfg;
      },
      getBodyWorldCenter: (): [number, number, number] => {
        const v = this.body.root.getWorldPosition(new Vector3());
        return [v.x, v.y, v.z];
      },
      enterDeterministicCapture: () => {
        this.renderer.setAnimationLoop(null);
      },
      renderFrameAt: (sec: number) => {
        this.update(1 / 72, sec);
        appState.telemetry.fps = 72;
        this.renderer.render(this.scene, this.camera);
      },
    };
  }

  /* ----------------------------- desktop input ----------------------------- */
  private bindPointer(): void {
    const dom = this.renderer.domElement;
    const ndc = (e: PointerEvent | WheelEvent) => {
      const r = dom.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const move = (e: PointerEvent) => {
      ndc(e);
      if (this.dragging) {
        const dx = e.clientX - this.dragPrev.x;
        this.yawVel = dx * 0.006;
        this.yaw += this.yawVel;
        this.dragPrev.set(e.clientX, e.clientY);
      }
      this.hoverDirty = true;
    };
    const down = (e: PointerEvent) => {
      ndc(e);
      this.dragging = true;
      this.dragStart.set(e.clientX, e.clientY);
      this.dragPrev.set(e.clientX, e.clientY);
      dom.setPointerCapture?.(e.pointerId);
      getXRayMirrorBridge()?.audio.ensureContext();
    };
    const up = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - this.dragStart.x, e.clientY - this.dragStart.y);
      this.dragging = false;
      if (moved < 5) {
        ndc(e);
        this.pick(true);
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      this.zoom = Math.max(-0.6, Math.min(1.2, this.zoom + e.deltaY * 0.001));
    };
    const leave = () => {
      appState.hoveredStructureId = null;
    };
    dom.addEventListener('pointermove', move);
    dom.addEventListener('pointerdown', down);
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointerleave', leave);
    dom.addEventListener('wheel', wheel, { passive: false });
    this.cleanupFuncs.push(() => {
      dom.removeEventListener('pointermove', move);
      dom.removeEventListener('pointerdown', down);
      dom.removeEventListener('pointerup', up);
      dom.removeEventListener('pointerleave', leave);
      dom.removeEventListener('wheel', wheel);
    });
  }

  private pick(click: boolean): void {
    if (!appState.inStudio) {
      this.renderer.domElement.style.cursor = 'grab';
      return;
    }
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects([this.body.root, ...this.mirrorHands.map((h) => h.root)], true);
    let id: string | null = null;
    for (const h of hits) {
      const sid = h.object.userData?.structureId as string | undefined;
      if (sid && isShown(h.object)) {
        id = sid;
        break;
      }
    }
    appState.hoveredStructureId = id;
    this.renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    if (click && id) {
      const info = ANATOMY_STRUCTURES.find((s) => s.id === id);
      if (info) getXRayMirrorBridge()?.triggerStructureSelect(info);
    }
  }

  /* ----------------------------- actions ----------------------------------- */
  private currentHeadPose(): { hp: Vector3; hq: Quaternion } {
    const hp = new Vector3();
    const hq = new Quaternion();
    if (this.simMR) {
      hp.set(this.simMR.headPos[0], this.simMR.headPos[1], this.simMR.headPos[2]);
      this.camera.position.copy(hp);
      this.camera.lookAt(this.simMR.lookAt[0], this.simMR.lookAt[1], this.simMR.lookAt[2]);
      hq.copy(this.camera.quaternion);
    } else {
      this.player.head.getWorldPosition(hp);
      this.player.head.getWorldQuaternion(hq);
    }
    return { hp, hq };
  }

  public recenter(): void {
    this.zoom = 0;
    this.yaw = 0;
    this.yawVel = 0;
    if (this.world.xrSession || this.simMR) {
      const { hp, hq } = this.currentHeadPose();
      const fwd = new Vector3(0, 0, -1).applyQuaternion(hq);
      fwd.y = 0;
      if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
      fwd.normalize();
      this.anchor.position.copy(hp).addScaledVector(fwd, 1.48);
      this.anchor.position.y = 0;
      this.anchor.lookAt(hp.x, 0, hp.z);
      // frame geometry is authored in body space; the XR anchor sits on the real floor
      this.ui.mirrorFrame.position.y = -SOLE_Y;
      // Seated-optimized poke console (44 cm / 17.3 in — well within 2-foot airplane seat radius)
      const right = new Vector3().crossVectors(fwd, new Vector3(0, 1, 0)).normalize();
      this.ui.deck.position.copy(hp).addScaledVector(fwd, 0.45).addScaledVector(right, -0.18);
      this.ui.deck.position.y = hp.y - 0.25;
      this.ui.deck.scale.setScalar(0.76);
      this.ui.deck.lookAt(hp.x, hp.y + 0.02, hp.z);
      // Seated tabletop specimen: 50 cm ahead, slightly right, below the eye line (inside the 2-foot radius)
      this.placeTabletop(hp, fwd, right);
    } else {
      this.camera.fov = 40;
      this.camera.updateProjectionMatrix();
      this.anchor.position.set(0, ANCHOR_Y, ANCHOR_Z);
      this.anchor.rotation.set(0, 0, 0);
    }
    getXRayMirrorBridge()?.audio.playBootChime();
  }

  /** 0.3x specimen (~52 cm tall) floating like a model on a desk in front of a seated user. */
  private placeTabletop(hp: Vector3, fwd: Vector3, right: Vector3): void {
    const y = hp.y - 0.36;
    this.detached.position.copy(hp).addScaledVector(fwd, 0.5).addScaledVector(right, 0.1);
    this.detached.position.y = y;
    this.detached.lookAt(hp.x, y, hp.z);
  }

  public toggleDetach(): void {
    appState.detachedHologram = !appState.detachedHologram;
    const inMR = Boolean(this.world.xrSession) || Boolean(this.simMR);
    if (appState.detachedHologram) {
      if (inMR) {
        const { hp, hq } = this.currentHeadPose();
        const fwd = new Vector3(0, 0, -1).applyQuaternion(hq);
        fwd.y = 0;
        if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1);
        fwd.normalize();
        const right = new Vector3().crossVectors(fwd, new Vector3(0, 1, 0)).normalize();
        this.placeTabletop(hp, fwd, right);
        appState.detachedScale = 0.3;
      } else {
        this.detached.position.set(0, ANCHOR_Y, ANCHOR_Z + 0.55);
        this.detached.rotation.set(0, 0, 0);
        appState.detachedScale = 0.94;
      }
      this.detached.scale.setScalar(appState.detachedScale);
      this.detached.add(this.body.root);
    } else {
      this.holder.add(this.body.root);
      appState.detachedScale = 1;
      this.detached.scale.setScalar(1);
    }
    this.body.root.position.set(0, 0, 0);
    getXRayMirrorBridge()?.audio.playSliceSweep();
    notifyStateChanged();
  }

  private bindXRSessionEvents(session: XRSession | null): void {
    if (session === this.boundXRSession) return;
    this.boundXRSession = session;
    if (!session) return;
    session.addEventListener('visibilitychange', () => {
      if (session.visibilityState !== 'visible') {
        const b = getXRayMirrorBridge();
        b?.audio.stopSpeaking();
        b?.audio.updateLensProximityHum(0);
      }
    });
    session.addEventListener('selectstart', (ev: XRInputSourceEvent) => {
      const frame = ev.frame;
      const ref = this.world.xrReferenceSpace;
      if (!frame || !ref) return;
      const rayPose = frame.getPose(ev.inputSource.targetRaySpace, ref);
      if (!rayPose) return;
      const pm = this.player.matrixWorld;
      const origin = new Vector3(rayPose.transform.position.x, rayPose.transform.position.y, rayPose.transform.position.z).applyMatrix4(pm);
      const q = new Quaternion(rayPose.transform.orientation.x, rayPose.transform.orientation.y, rayPose.transform.orientation.z, rayPose.transform.orientation.w);
      const dir = new Vector3(0, 0, -1).applyQuaternion(q).transformDirection(pm).normalize();
      this.raycaster.set(origin, dir);
      const deckHits = this.raycaster.intersectObjects(this.ui.deck.children, true);
      if (deckHits.length && this.ui.triggerButtonByMesh(deckHits[0].object)) return;
      const bodyHits = this.raycaster.intersectObjects([this.body.root], true);
      for (const h of bodyHits) {
        const sid = h.object.userData?.structureId as string | undefined;
        if (sid && isShown(h.object)) {
          const info = ANATOMY_STRUCTURES.find((s) => s.id === sid);
          if (info) getXRayMirrorBridge()?.triggerStructureSelect(info);
          return;
        }
      }
    });
  }

  private updateXRTouchPick(dt: number, tips: Vector3[]): void {
    this.touchPickCooldown = Math.max(0, this.touchPickCooldown - dt);
    if (!tips.length) return;
    const anchor = new Vector3();
    let bestId: string | null = null;
    let bestDist = 0.055;
    for (const s of ANATOMY_STRUCTURES) {
      if (!appState.layers[s.layer] || s.attach === 'hand-L' || s.attach === 'hand-R') continue;
      anchor.set(s.local[0], s.local[1], s.local[2]);
      this.body.nodes[s.attach].localToWorld(anchor);
      for (const t of tips) {
        const d = t.distanceTo(anchor);
        if (d < bestDist) {
          bestDist = d;
          bestId = s.id;
        }
      }
    }
    if (bestId) appState.hoveredStructureId = bestId;
    if (bestId && bestDist < 0.034 && this.touchPickCooldown <= 0) {
      this.touchPickCooldown = 0.65;
      const info = ANATOMY_STRUCTURES.find((x) => x.id === bestId);
      if (info) getXRayMirrorBridge()?.triggerStructureSelect(info);
    }
  }

  /* ----------------------------- camera ------------------------------------ */
  private stageRect(): StageRect {
    const W = window.innerWidth;
    const H = window.innerHeight;
    if (!appState.inStudio) {
      const leftPad = W > 900 ? Math.round(W * 0.45) : 0;
      return { left: leftPad, top: 20, right: W - 20, bottom: H - 20 };
    }
    const side = document.getElementById('sidebar');
    const header = document.querySelector('.hud-header') as HTMLElement | null;
    const top = header ? header.getBoundingClientRect().bottom : 64;
    const isBottomSheet = W <= 960 && H >= 560;
    if (isBottomSheet) {
      // bottom-sheet layout: the stage is the band between the header and the stage toolbar
      const tb = document.getElementById('studio-stage-toolbar');
      const sheetTop = side && !side.hidden ? side.getBoundingClientRect().top : H;
      const tbTop = tb && !tb.hidden ? tb.getBoundingClientRect().top : sheetTop;
      return { left: 0, top: top + 4, right: W, bottom: Math.max(top + 140, Math.min(sheetTop, tbTop) - 6) };
    }
    const sw = side && !side.hidden && !side.classList.contains('is-collapsed') ? side.getBoundingClientRect().width + 16 : 0;
    return { left: 0, top: top + 4, right: Math.max(180, W - sw), bottom: H - (H < 560 ? 54 : 70) };
  }

  private frameDesktopCamera(dt: number, stage: StageRect): void {
    const W = window.innerWidth;
    const H = window.innerHeight;
    // Shift the projection centre onto the centre of the visible stage region (handles side panels,
    // header, and mobile bottom sheets) and pull the camera back when the region is short.
    const sx = (stage.left + stage.right) / 2 - W / 2;
    const sy = (stage.top + stage.bottom) / 2 - H / 2;
    const fullW = W + 2 * Math.abs(sx);
    const fullH = H + 2 * Math.abs(sy);
    const key = `${W}x${H}:${Math.round(sx)}:${Math.round(sy)}`;
    if (key !== this.viewKey) {
      this.viewKey = key;
      this.camera.aspect = fullW / fullH;
      if (Math.abs(sx) > 0.5 || Math.abs(sy) > 0.5) this.camera.setViewOffset(fullW, fullH, sx > 0 ? 0 : 2 * Math.abs(sx), sy > 0 ? 0 : 2 * Math.abs(sy), W, H);
      else this.camera.clearViewOffset();
      this.camera.updateProjectionMatrix();
    }
    const regionFrac = Math.max(0.15, (stage.bottom - stage.top) / fullH);
    const regionAspect = (stage.right - stage.left) / Math.max(1, stage.bottom - stage.top);
    // full body needs ~0.42 width/height; narrow portrait regions need extra distance
    const widthFit = appState.viewFraming === 'full' ? Math.max(1, 0.5 / Math.max(0.2, regionAspect)) : 1;
    const fitK = Math.min(4.2, Math.max(1, 0.82 / regionFrac) * widthFit);
    const f = FRAMING[appState.viewFraming] ?? FRAMING.full;
    const dist = f.dist * fitK * (1 + this.zoom);
    const snap = this.lastFraming !== appState.viewFraming;
    this.lastFraming = appState.viewFraming;
    const k = snap ? 1 : 1 - Math.exp(-dt * 8);
    this.camera.position.x += (0 - this.camera.position.x) * k;
    this.camera.position.y += (f.y + 0.02 - this.camera.position.y) * k;
    this.camera.position.z += (ANCHOR_Z + dist - this.camera.position.z) * k;
    this.camera.lookAt(0, f.y, ANCHOR_Z);
  }

  /* ----------------------------- frame ------------------------------------- */
  update(delta: number, time: number): void {
    const bridge = getXRayMirrorBridge();
    if (!bridge) return;
    const dt = Math.min(0.05, delta);
    const u = this.u;
    u.uTime.value = time;
    u.uLookMode.value = appState.lookMode === 'solid' ? 1 : 0;
    u.uBrightness.value = appState.brightness;
    u.uEdgeFeather.value = appState.edgeFeather;
    u.uBaseOpacity.value = Math.max(0.2, 1 - appState.realMeShowing * 0.65);
    this.handU.uTime.value = time;
    this.handU.uLookMode.value = u.uLookMode.value;
    this.handU.uBrightness.value = u.uBrightness.value;
    this.handU.uEdgeFeather.value = u.uEdgeFeather.value;
    this.handU.uBaseOpacity.value = 0.94;
    this.handU.uRevealMode.value = 0;
    document.documentElement.style.setProperty('--webcam-opacity', (0.78 + appState.realMeShowing * 0.22).toFixed(2));

    const solid = appState.lookMode === 'solid';
    this.body.setLookMode(solid);
    for (const h of [...this.mirrorHands, ...this.directHands]) h.setLookMode(solid);
    this.body.setLayerVisibility(appState.layers);
    this.body.updatePhysiology(time);
    this.body.setExploded(appState.explodedFactor);
    const hi = appState.hoveredStructureId ?? appState.selectedStructureId;
    this.body.highlightStructure(hi);
    for (const h of [...this.mirrorHands, ...this.directHands]) h.highlight(hi === 'hand-skeleton');

    this.bindXRSessionEvents(this.world.xrSession ?? null);
    const inXR = Boolean(this.world.xrSession) || Boolean(this.simMR);
    if (inXR !== this.wasXR) {
      this.wasXR = inXR;
      document.body.classList.toggle('xr-passthrough-active', inXR);
      this.viewKey = '';
      if (inXR) {
        this.camera.clearViewOffset();
        if (this.simMR) {
          this.camera.fov = 56;
          this.camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
          this.camera.updateProjectionMatrix();
        }
        this.recenter();
        if (this.world.xrSession) bridge.audio.enableMicrophoneJawTracking().catch(() => { });
      } else {
        this.recenter();
      }
    }
    this.ui.mirrorFrame.visible = inXR && !appState.detachedHologram;
    this.ui.deck.visible = inXR;
    this.ui.plaque.visible = inXR && !appState.detachedHologram;

    const stage = this.stageRect();
    const fit = appState.fit;
    let lens: Vector3 | null = null;
    let palmN: Vector3 | null = null;
    let palmP: Vector3 | null = null;
    let hands: [ReadonlyMap<string, Vector3> | null, ReadonlyMap<string, Vector3> | null] = [null, null];
    const tips: Vector3[] = [];
    const t = appState.telemetry;

    if (inXR) {
      /* ===================== A. Quest passthrough mirror ===================== */
      t.runtimeMode = 'quest-webxr';
      const { hp, hq } = this.currentHeadPose();
      this.anchor.updateMatrixWorld(true);
      const inv = new Matrix4().copy(this.anchor.matrixWorld).invert();
      const anchorQ = this.anchor.getWorldQuaternion(new Quaternion());
      const headL = hp.clone().applyMatrix4(inv);
      // reflect head rotation across the mirror plane: (qx, qy, qz, qw) -> (-qx, -qy, qz, qw)
      const qL = anchorQ.clone().invert().multiply(hq);
      const qR = new Quaternion(-qL.x, -qL.y, qL.z, qL.w);
      const e = new Euler().setFromQuaternion(qR, 'YXZ');
      const scale = fit.overallSize;
      t.distanceCm = Math.round(headL.z * 100);
      t.yawDeg = Math.round((e.y * 180) / Math.PI);
      t.pitchDeg = Math.round((e.x * 180) / Math.PI);
      t.rollDeg = Math.round((e.z * 180) / Math.PI);
      t.bodyStatus = 'headset + hands';

      // gather XR hand joints (index 0 = user's left -> mirror viewer-left)
      this.xrJoints[0].clear();
      this.xrJoints[1].clear();
      const frame = this.world.xrFrame;
      const ref = this.world.xrReferenceSpace;
      const found: string[] = [];
      if (this.simMR) {
        const lTip = new Vector3(...this.simMR.leftTip);
        const rTip = new Vector3(...this.simMR.rightTip);
        tips.push(lTip, rTip);
        const lDir = new Vector3(0.05, 0.32, -0.94).normalize();
        const rDir = new Vector3(-0.05, 0.32, -0.94).normalize();
        proceduralHand(-1, lTip.clone().addScaledVector(lDir, -0.145), lDir, new Vector3(0.25, -0.88, -0.35).normalize(), time, this.xrJoints[0], 0.95);
        proceduralHand(1, rTip.clone().addScaledVector(rDir, -0.145), rDir, new Vector3(-0.25, -0.88, -0.35).normalize(), time, this.xrJoints[1], 0.95);
        found.push('left', 'right');
      } else if (frame && ref && this.world.xrSession) {
        const pm = this.player.matrixWorld;
        for (const src of this.world.xrSession.inputSources) {
          if (!src.hand) continue;
          const map = this.xrJoints[src.handedness === 'left' ? 0 : 1];
          found.push(src.handedness);
          for (const j of XR_HAND_JOINTS) {
            const sp = src.hand.get(j as XRHandJoint);
            const pose = sp ? frame.getJointPose?.(sp, ref) : undefined;
            if (pose) map.set(j, new Vector3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z).applyMatrix4(pm));
          }
        }
      }
      if (!this.simMR) {
        for (const [i, side] of [[0, 'left'], [1, 'right']] as Array<[number, 'left' | 'right']>) {
          const tip = new Vector3();
          this.player.indexTipSpaces[side].getWorldPosition(tip);
          if (tip.lengthSq() > 1e-3) {
            tips.push(tip);
            if (this.xrJoints[i].size === 0) {
              proceduralHand((i === 0 ? -1 : 1) as Side, tip.clone().add(new Vector3(0, -0.15, 0.03)), new Vector3(0, 1, -0.3), new Vector3(0, 0, -1), time, this.xrJoints[i]);
              found.push(`${side} (emulated)`);
            }
          }
        }
      }
      t.handsStatus = found.length ? found.join(', ') : 'raise your hands';
      this.directHands[0].root.visible = true;
      this.directHands[1].root.visible = true;
      this.directHands[0].update(this.xrJoints[0], appState.layers.skeleton, appState.layers.skin);
      this.directHands[1].update(this.xrJoints[1], appState.layers.skeleton, appState.layers.skin);

      const tabletop = appState.detachedHologram;
      // Seated users (head below ~1.42 m) see a full standing reflection grounded on the real floor,
      // instead of a body whose feet sink through the floor.
      const seated = headL.y < 1.42 * scale;
      if (!tabletop) {
        this.body.root.scale.set(scale * fit.width, scale * fit.height, scale * fit.depth);
        const rootY = seated ? -SOLE_Y * scale * fit.height : headL.y - EYE_Y * scale;
        this.body.root.position.set(headL.x + fit.leftRightCm * 0.01, rootY + fit.upDownCm * 0.01, fit.forwardBackCm * 0.01);
        this.body.root.rotation.set(0, 0, 0);
      } else {
        this.detached.scale.setScalar(appState.detachedScale);
        this.body.root.scale.set(fit.width, fit.height, fit.depth);
        this.body.root.position.set(0, 0, 0);
        this.body.root.rotation.set(0, 0, 0);
      }
      const wristT: [Vector3 | undefined, Vector3 | undefined] = [undefined, undefined];
      if (!tabletop) {
        for (const i of [0, 1]) {
          const w = this.xrJoints[i].get('wrist');
          if (!w) continue;
          const wl = w.clone().applyMatrix4(inv);
          const t3 = new Vector3((wl.x - headL.x) / scale, (wl.y - headL.y) / scale + EYE_Y, (0.03 + (headL.z - wl.z)) / scale);
          // clamp to anatomically reachable arm span so the reflection never dislocates a shoulder
          t3.x = Math.max(-0.62, Math.min(0.62, t3.x));
          t3.y = Math.max(-0.2, Math.min(0.95, t3.y));
          t3.z = Math.max(-0.1, Math.min(0.55, t3.z));
          wristT[i] = t3;
        }
      }
      // Tabletop specimen holds a calm anatomical pose; the mirror reflects your head and arms.
      this.body.updatePose(tabletop ? { head: { x: 0, y: 0, z: 0 } } : { head: { x: e.x, y: e.y, z: e.z }, wrist: wristT }, time);
      const jawXR = this.demoJaw !== null ? this.demoJaw : bridge.audio.sampleMicJawOpenness(dt);
      this.body.setJawOpen(jawXR);
      t.jawOpenPct = Math.round(jawXR * 100);

      // reflect real finger articulation onto the mirror body's wrists
      this.body.root.updateMatrixWorld(true);
      for (const i of [0, 1]) {
        const rigWrist = this.body.root.localToWorld(this.body.wristLocal[i].clone());
        const real = this.xrJoints[i];
        const rw = real.get('wrist');
        const out = this.mirrorJoints[i];
        if (rw && !tabletop) {
          const rwl = rw.clone().applyMatrix4(inv);
          out.clear();
          real.forEach((p, k) => {
            const d = p.clone().applyMatrix4(inv).sub(rwl);
            d.z = -d.z;
            out.set(k, rigWrist.clone().add(d.applyQuaternion(anchorQ)));
          });
        } else {
          const down = this.body.forearmDirLocal[i].clone().transformDirection(this.body.root.matrixWorld);
          const fwd = new Vector3(0, 0, 1).transformDirection(this.body.root.matrixWorld);
          const handScale = this.body.root.getWorldScale(new Vector3()).y;
          proceduralHand((i === 0 ? -1 : 1) as Side, rigWrist, down, fwd, time, out, handScale);
        }
        this.mirrorHands[i].update(out, appState.layers.skeleton, appState.layers.skin);
      }
      hands = [this.mirrorJoints[0], this.mirrorJoints[1]];

      const rTip = this.xrJoints[1].get('index-finger-tip') ?? tips[0];
      if (rTip) {
        lens = rTip.clone();
        t.indexFingertip = [Number(rTip.x.toFixed(2)), Number(rTip.y.toFixed(2)), Number(rTip.z.toFixed(2))];
      }
      const ph = this.xrJoints[1].size ? this.xrJoints[1] : this.xrJoints[0];
      const w0 = ph.get('wrist');
      const iP = ph.get('index-finger-phalanx-proximal');
      const pP = ph.get('pinky-finger-phalanx-proximal');
      if (this.simMR?.palmNormal && this.simMR?.palmPoint) {
        palmN = new Vector3(...this.simMR.palmNormal).normalize();
        palmP = new Vector3(...this.simMR.palmPoint);
      } else if (w0 && iP && pP) {
        palmN = new Vector3().crossVectors(iP.clone().sub(w0), pP.clone().sub(w0)).normalize();
        if (tabletop) {
          // Specimen is within reach: the cut plane passes exactly through your real palm.
          palmP = w0.clone().add(iP).add(pP).multiplyScalar(1 / 3);
        } else {
          const bodyC = this.body.root.getWorldPosition(new Vector3());
          palmP = bodyC.add(new Vector3((w0.x - hp.x) * 1.5, (w0.y - hp.y + 0.45) * 1.5, 0).applyQuaternion(anchorQ));
        }
      }
      if (this.demoLens) lens = this.demoLens.clone();
      this.ui.updatePokes(dt, tips);
      this.updateXRTouchPick(dt, tips);
    } else {
      /* ================= B/C. Desktop: webcam mirror or 3D studio ================ */
      this.frameDesktopCamera(dt, stage);
      for (const h of this.directHands) h.root.visible = false;
      const webcam = bridge.webcam.isRunning;
      document.body.classList.toggle('webcam-active', webcam);
      t.runtimeMode = webcam ? 'webcam-mediapipe' : 'interactive-3d';
      this.camera.updateMatrixWorld();
      const planeDepth = Math.abs(this.camera.position.z - ANCHOR_Z);

      if (webcam) {
        const snap = bridge.webcam.update(time, this.camera, planeDepth);
        t.bodyStatus = snap.landmarkSummary;
        t.distanceCm = snap.distanceCm;
        const sc = snap.bodyScale * fit.overallSize;
        if (!appState.detachedHologram) {
          const parent = this.body.root.parent ?? this.holder;
          parent.updateMatrixWorld(true);
          const target = snap.rootWorld.clone().add(new Vector3(fit.leftRightCm * 0.01, fit.upDownCm * 0.01, fit.forwardBackCm * 0.01));
          this.body.root.position.copy(parent.worldToLocal(target));
          this.body.root.rotation.set(0, 0, 0);
          this.body.root.scale.set(sc * fit.width, sc * fit.height, sc * fit.depth);
        }
        this.body.updatePose(snap.poseDetected ? snap.pose : { head: { x: snap.headEuler.x, y: snap.headEuler.y, z: snap.headEuler.z } }, time);
        t.yawDeg = Math.round((snap.headEuler.y * 180) / Math.PI);
        t.pitchDeg = Math.round((snap.headEuler.x * 180) / Math.PI);
        t.rollDeg = Math.round((snap.headEuler.z * 180) / Math.PI);
        const jaw = Math.max(snap.jawOpen01, bridge.audio.sampleMicJawOpenness(dt));
        this.body.setJawOpen(jaw);
        t.jawOpenPct = Math.round(jaw * 100);
        this.body.root.updateMatrixWorld(true);
        for (const i of [0, 1]) {
          const real = snap.hands[i];
          if (real.size > 0) {
            this.mirrorHands[i].update(real, appState.layers.skeleton, appState.layers.skin);
            hands[i] = real;
          } else {
            const w = this.body.root.localToWorld(this.body.wristLocal[i].clone());
            const down = this.body.forearmDirLocal[i].clone().transformDirection(this.body.root.matrixWorld);
            const fwd = new Vector3(0, 0, 1).transformDirection(this.body.root.matrixWorld);
            proceduralHand((i === 0 ? -1 : 1) as Side, w, down, fwd, time, this.mirrorJoints[i], sc);
            this.mirrorHands[i].update(this.mirrorJoints[i], appState.layers.skeleton, appState.layers.skin);
            hands[i] = this.mirrorJoints[i];
          }
        }
        t.handsStatus = snap.hands[0].size || snap.hands[1].size ? 'tracked' : 'following body';
        lens = snap.primaryTip;
        if (snap.primaryTipNorm) t.indexFingertip = [snap.primaryTipNorm[0], snap.primaryTipNorm[1], 0];
      } else {
        // Interactive studio: drag to rotate (with inertia), head follows the pointer
        if (!this.dragging) {
          if (!appState.inStudio) {
            this.yaw += dt * 0.22;
            this.yawVel = 0;
          } else {
            this.yawVel *= Math.exp(-dt * 4);
            this.yaw += this.yawVel;
          }
        }
        t.bodyStatus = 'studio (drag to rotate)';
        t.distanceCm = Math.round(planeDepth * 100);
        const sc = fit.overallSize;
        if (!appState.detachedHologram) {
          this.body.root.position.set(fit.leftRightCm * 0.01, fit.upDownCm * 0.01, fit.forwardBackCm * 0.01);
          this.body.root.scale.set(sc * fit.width, sc * fit.height, sc * fit.depth);
        } else {
          this.detached.scale.setScalar(appState.detachedScale);
        }
        this.body.root.rotation.set(0, this.yaw, 0);
        const lookYaw = Math.max(-0.35, Math.min(0.35, this.pointer.x * 0.35));
        const lookPitch = Math.max(-0.2, Math.min(0.25, -(this.pointer.y - 0.3) * 0.18));
        this.body.updatePose(this.demoPose ?? { head: { x: lookPitch, y: lookYaw, z: 0 } }, time);
        t.yawDeg = Math.round(((this.yaw % (Math.PI * 2)) * 180) / Math.PI);
        t.pitchDeg = Math.round((lookPitch * 180) / Math.PI);
        t.rollDeg = 0;
        const jaw =
          this.demoJaw !== null
            ? this.demoJaw
            : bridge.audio.micActive || bridge.audio.hasActiveCoachVoice
            ? bridge.audio.sampleMicJawOpenness(dt)
            : 0;
        this.body.setJawOpen(jaw);
        t.jawOpenPct = Math.round(jaw * 100);
        this.body.root.updateMatrixWorld(true);
        for (const i of [0, 1]) {
          const w = this.body.root.localToWorld(this.body.wristLocal[i].clone());
          const down = this.body.forearmDirLocal[i].clone().transformDirection(this.body.root.matrixWorld);
          const fwd = new Vector3(0, 0, 1).transformDirection(this.body.root.matrixWorld);
          proceduralHand((i === 0 ? -1 : 1) as Side, w, down, fwd, time, this.mirrorJoints[i], sc);
          this.mirrorHands[i].update(this.mirrorJoints[i], appState.layers.skeleton, appState.layers.skin);
          hands[i] = this.mirrorJoints[i];
        }
        t.handsStatus = 'anatomical position';
        // pointer -> point on the body's coronal plane for the lens / slicer
        if (this.demoLens) {
          lens = this.demoLens.clone();
          palmP = lens.clone();
          palmN = new Vector3(Math.cos(this.pointer.y * 1.4), Math.sin(this.pointer.y * 1.4), 0.12).normalize();
        } else {
          this.raycaster.setFromCamera(this.pointer, this.camera);
          const p = new Vector3();
          if (this.raycaster.ray.intersectPlane(new Plane(new Vector3(0, 0, 1), -(ANCHOR_Z + 0.06)), p)) {
            lens = p;
            palmP = p.clone();
            palmN = new Vector3(Math.cos(this.pointer.y * 1.4), Math.sin(this.pointer.y * 1.4), 0.12).normalize();
          }
        }
        t.indexFingertip = [Number(((this.pointer.x + 1) / 2).toFixed(2)), Number(((1 - this.pointer.y) / 2).toFixed(2)), 0];
      }

      this.hoverTimer += dt;
      if (this.hoverDirty && this.hoverTimer > 0.06 && !this.dragging) {
        this.hoverTimer = 0;
        this.hoverDirty = false;
        this.pick(false);
      }
    }

    this.updateReveal(lens, palmN, palmP);
    // floor shadow under the feet (on the real floor in MR)
    const rs = this.body.root.scale.y;
    this.shadow.visible = !appState.detachedHologram;
    this.shadow.position.set(this.body.root.position.x, inXR ? 0.003 : this.body.root.position.y + SOLE_Y * rs + 0.002, this.body.root.position.z);
    this.shadow.scale.setScalar(rs);
    this.updateModes(dt, lens, hands);
    bridge.labelsOverlay.update(this.camera, this.body, hands, inXR, stage, { mode: u.uRevealMode.value, plane: u.uClipPlane.value });

    this.fpsT += delta;
    this.fpsN++;
    if (this.fpsT >= 0.5) {
      t.fps = Math.round(this.fpsN / this.fpsT);
      t.drawCalls = this.renderer.info.render.calls;
      t.activeLayersList = (Object.keys(appState.layers) as Array<keyof typeof appState.layers>).filter((k) => appState.layers[k]).join(', ') || 'none';
      this.fpsT = 0;
      this.fpsN = 0;
    }
    this.uiT += delta;
    if (this.uiT >= 0.15) {
      this.uiT = 0;
      notifyStateChanged();
    }
  }

  private updateReveal(lens: Vector3 | null, palmN: Vector3 | null, palmP: Vector3 | null): void {
    const mode = appState.revealMode;
    const u = this.u;
    const root = this.body.root;
    const c = root.getWorldPosition(new Vector3());
    const s = root.getWorldScale(new Vector3()).y;
    const audio = getXRayMirrorBridge()?.audio;
    this.ui.lensRing.visible = false;
    this.ui.palmPlane.visible = false;
    if (mode === 'whole') {
      u.uRevealMode.value = 0;
      audio?.updateLensProximityHum(0);
      return;
    }
    if (mode === 'lens') {
      u.uRevealMode.value = 1;
      const target = lens ?? c.clone().add(new Vector3(0, 0.33 * s, 0));
      // Lens radius scales with the specimen so a tabletop body gets a proportionate lens.
      const radius = appState.lensSize * Math.min(1, s);
      u.uLensCenter.value.copy(target);
      u.uLensRadius.value = radius;
      this.ui.lensRing.visible = true;
      this.ui.lensRing.position.copy(target);
      // ring geometry radius = 0.054 m -> ring sits exactly on the reveal boundary
      this.ui.lensRing.scale.setScalar(radius / 0.054);
      this.ui.lensRing.lookAt(this.camera.getWorldPosition(new Vector3()));
      audio?.updateLensProximityHum(Math.max(0, 1 - target.distanceTo(c) / 1.0));
      return;
    }
    u.uRevealMode.value = 2;
    audio?.updateLensProximityHum(0);
    const n = new Vector3(1, 0, 0);
    const p = c.clone();
    const cut = appState.cutPosition;
    if (mode === 'left-half') {
      n.set(-1, 0, 0);
      p.x += cut * 0.3 * s;
    } else if (mode === 'right-half') {
      n.set(1, 0, 0);
      p.x += cut * 0.3 * s;
    } else if (mode === 'upper-cut') {
      n.set(0, 1, 0);
      p.y += (-0.05 + cut * 0.85) * s;
    } else if (mode === 'lower-cut') {
      n.set(0, -1, 0);
      p.y += (-0.05 + cut * 0.85) * s;
    } else if (mode === 'palm-slicer' && palmN && palmP) {
      n.copy(palmN);
      p.copy(palmP);
      this.ui.palmPlane.visible = true;
      this.ui.palmPlane.position.copy(p);
      this.ui.palmPlane.scale.setScalar(Math.max(0.35, Math.min(1, s)));
      this.ui.palmPlane.lookAt(p.clone().add(n));
    }
    if (mode !== 'palm-slicer') {
      // preset cuts follow the body's own axes (correct even when the mirror/tabletop is rotated in the room)
      const q = root.getWorldQuaternion(new Quaternion());
      const off = p.clone().sub(c).applyQuaternion(q);
      n.applyQuaternion(q);
      p.copy(c).add(off);
    }
    u.uClipPlane.value.set(n.x, n.y, n.z, -n.dot(p));
  }

  private updateModes(dt: number, lens: Vector3 | null, hands: [ReadonlyMap<string, Vector3> | null, ReadonlyMap<string, Vector3> | null]): void {
    this.beacon.visible = false;
    const lang = appState.coachLanguage;
    const ui = getCoachUIStrings(lang);
    if (appState.productivityMode === 'detective') {
      const cs = CLINICAL_CASES[appState.activeCaseIndex % CLINICAL_CASES.length];
      const locCase = getLocalizedClinicalCase(cs, lang);
      const pos = new Vector3();
      let ok = false;
      if (cs.attach === 'hand-L' || cs.attach === 'hand-R') {
        const j = cs.handJoint ? hands[cs.attach === 'hand-L' ? 0 : 1]?.get(cs.handJoint) : undefined;
        if (j) {
          pos.copy(j);
          ok = true;
        }
      } else {
        pos.set(cs.local[0], cs.local[1], cs.local[2]);
        this.body.nodes[cs.attach].localToWorld(pos);
        ok = true;
      }
      if (ok) {
        this.beacon.position.copy(pos);
        this.beacon.lookAt(this.camera.getWorldPosition(new Vector3()));
        const exposed = appState.revealMode !== 'lens' || (lens !== null && lens.distanceTo(pos) < appState.lensSize);
        this.beacon.visible = exposed;
        if (lens && lens.distanceTo(pos) < appState.lensSize * 0.6) {
          appState.caseScanProgress = Math.min(100, appState.caseScanProgress + dt * 70);
          if (appState.caseScanProgress >= 100 && !appState.solvedCases.includes(cs.id)) {
            appState.solvedCases.push(cs.id);
            appState.masteryStreak += 1;
            savePersistedProgress(appState);
            const b = getXRayMirrorBridge();
            b?.audio.playSuccessChord();
            b?.audio.speakExplanation(locCase.solvedSpoken, lang);
            appState.aiLastTitle = `${ui.diagnosedPrefix}: ${locCase.title}`;
            appState.aiLastAnswer = locCase.bodySolved;
          }
        } else {
          appState.caseScanProgress = Math.max(0, appState.caseScanProgress - dt * 25);
        }
      }
      this.ui.updatePlaque(`${locCase.badge} · ${appState.solvedCases.length}/${CLINICAL_CASES.length}`, locCase.title, locCase.bodyUnsolved, `Lock-on ${Math.round(appState.caseScanProgress)}%`);
      return;
    }
    if (appState.productivityMode === 'pinpoint') {
      const p = PINPOINT_PROMPTS[appState.pinpointIndex % PINPOINT_PROMPTS.length];
      const clue = getLocalizedPinpointClue(p, lang);
      this.ui.updatePlaque(`Pinpoint · ${appState.pinpointScore} pts`, ui.quizTitle, clue, `${p.difficulty}`);
      return;
    }
    const sel = ANATOMY_STRUCTURES.find((s) => s.id === appState.selectedStructureId) ?? ANATOMY_STRUCTURES[0];
    const locSel = getLocalizedStructure(sel, lang);
    this.ui.updatePlaque(locSel.latinName, locSel.name, locSel.summary, `${appState.telemetry.fps} fps`);
  }
}
