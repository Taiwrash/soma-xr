import {
  BoxGeometry,
  CanvasTexture,
  DoubleSide,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
  Vector3,
} from '@iwsdk/core';
import { appState, applyLayerPreset, notifyStateChanged, RevealMode, savePersistedProgress } from '../state/appState';
import { COACH_LANGUAGES, getCoachLanguageMeta } from '../data/multilingualCoaching';
import { SpatialAudioAndVoiceEngine } from '../audio/spatialSynth';
import { MONO_CORE_HEX, MONO_DEEP_HEX } from '../shaders/xrayMaterial';

interface ButtonDef {
  id: string;
  label: string | (() => string);
  row: number;
  col: number;
  isActive: () => boolean;
  onTrigger: () => void;
}

interface ButtonInst {
  def: ButtonDef;
  mesh: Mesh;
  tex: CanvasTexture;
  canvas: HTMLCanvasElement;
  lastActive: boolean;
  lastHover: boolean;
  lastLabel: string;
  cooldown: number;
}

/**
 * Hands-first, seated-optimized XR spatial UI (passes the 2-foot Airplane Seat Test):
 * - mirrorFrame: minimal frame around the spatial reflection + clean info card
 * - deck: 4x3 bare-hand poke console positioned 40 cm ahead within effortless seated reach
 * - lensRing / palmPlane: 3D visualizers for the index-finger lens and flat-palm CT slicer
 */
export class SpatialControlConsole3D {
  public readonly mirrorFrame = new Group();
  public readonly deck = new Group();
  public readonly lensRing: Mesh;
  public readonly palmPlane: Mesh;
  public readonly plaque: Mesh;
  private plaqueCanvas: HTMLCanvasElement;
  private plaqueTex: CanvasTexture;
  private plaqueSig = '';
  private buttons: ButtonInst[] = [];

  constructor(private audio: SpatialAudioAndVoiceEngine, private onAction: (id: string) => void) {
    const bezel = new MeshBasicMaterial({ color: MONO_CORE_HEX, transparent: true, opacity: 0.42 });
    const frameH = 1.92;
    const frameW = 1.12;
    const cy = -0.0;
    const bars: Array<[number, number, number, number]> = [
      [0, cy + frameH / 2, frameW, 0.007],
      [0, cy - frameH / 2, frameW, 0.01],
      [-frameW / 2, cy, 0.007, frameH],
      [frameW / 2, cy, 0.007, frameH],
    ];
    for (const [x, y, w, h] of bars) {
      const b = new Mesh(new BoxGeometry(w, h, 0.008), bezel);
      b.position.set(x, y, -0.16);
      this.mirrorFrame.add(b);
    }

    this.plaqueCanvas = document.createElement('canvas');
    this.plaqueCanvas.width = 640;
    this.plaqueCanvas.height = 320;
    this.plaqueTex = new CanvasTexture(this.plaqueCanvas);
    this.plaqueTex.colorSpace = SRGBColorSpace;
    this.plaqueTex.minFilter = LinearFilter;
    this.plaque = new Mesh(new PlaneGeometry(0.48, 0.24), new MeshBasicMaterial({ map: this.plaqueTex, transparent: true, side: DoubleSide }));
    this.plaque.position.set(0.86, 0.5, 0.05);
    this.plaque.rotation.y = -0.28;
    this.mirrorFrame.add(this.plaque);

    const defs: ButtonDef[] = [
      { id: 'p-radio', label: 'X-Ray', row: 0, col: 0, isActive: () => appState.preset === 'radiograph', onTrigger: () => applyLayerPreset('radiograph') },
      { id: 'p-skel', label: 'Bones', row: 0, col: 1, isActive: () => appState.preset === 'skeleton', onTrigger: () => applyLayerPreset('skeleton') },
      { id: 'p-org', label: 'Organs', row: 0, col: 2, isActive: () => appState.preset === 'organs', onTrigger: () => applyLayerPreset('organs') },
      {
        id: 'look',
        label: 'Solid',
        row: 0,
        col: 3,
        isActive: () => appState.lookMode === 'solid',
        onTrigger: () => {
          appState.lookMode = appState.lookMode === 'xray' ? 'solid' : 'xray';
          notifyStateChanged();
        },
      },
      { id: 'lens', label: 'Finger lens', row: 1, col: 0, isActive: () => appState.revealMode === 'lens', onTrigger: () => this.reveal(appState.revealMode === 'lens' ? 'whole' : 'lens') },
      { id: 'palm', label: 'Palm slice', row: 1, col: 1, isActive: () => appState.revealMode === 'palm-slicer', onTrigger: () => this.reveal(appState.revealMode === 'palm-slicer' ? 'whole' : 'palm-slicer') },
      {
        id: 'explode',
        label: 'Separate',
        row: 1,
        col: 2,
        isActive: () => appState.explodedFactor > 0.2,
        onTrigger: () => {
          appState.explodedFactor = appState.explodedFactor > 0.2 ? 0 : 0.85;
          notifyStateChanged();
        },
      },
      { id: 'detach', label: 'Tabletop', row: 1, col: 3, isActive: () => appState.detachedHologram, onTrigger: () => this.onAction('toggle-detach') },
      {
        id: 'quiz',
        label: 'Quiz',
        row: 2,
        col: 0,
        isActive: () => appState.productivityMode === 'pinpoint',
        onTrigger: () => {
          appState.productivityMode = appState.productivityMode === 'pinpoint' ? 'explore' : 'pinpoint';
          notifyStateChanged();
        },
      },
      {
        id: 'cases',
        label: 'Fractures',
        row: 2,
        col: 1,
        isActive: () => appState.productivityMode === 'detective',
        onTrigger: () => {
          appState.productivityMode = appState.productivityMode === 'detective' ? 'explore' : 'detective';
          if (appState.productivityMode === 'detective') appState.revealMode = 'lens';
          notifyStateChanged();
        },
      },
      {
        id: 'lang',
        label: () => getCoachLanguageMeta(appState.coachLanguage).nativeName.slice(0, 10),
        row: 2,
        col: 2,
        isActive: () => appState.coachLanguage !== 'en',
        onTrigger: () => {
          const idx = COACH_LANGUAGES.findIndex((l) => l.code === appState.coachLanguage);
          const next = COACH_LANGUAGES[(idx + 1) % COACH_LANGUAGES.length];
          appState.coachLanguage = next.code;
          savePersistedProgress(appState);
          notifyStateChanged();
          this.onAction('lang-changed');
        },
      },
      { id: 'exit-mr', label: 'Exit MR', row: 2, col: 3, isActive: () => false, onTrigger: () => this.onAction('exit-xr') },
    ];

    const bw = 0.088;
    const bh = 0.036;
    for (const def of defs) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 104;
      const tex = new CanvasTexture(canvas);
      tex.colorSpace = SRGBColorSpace;
      tex.minFilter = LinearFilter;
      const mesh = new Mesh(new PlaneGeometry(bw, bh), new MeshBasicMaterial({ map: tex, transparent: true, side: DoubleSide }));
      mesh.position.set((def.col - 1.5) * (bw + 0.01), (1 - def.row) * (bh + 0.01), 0);
      mesh.userData.spatialButtonId = def.id;
      this.deck.add(mesh);
      const lbl = typeof def.label === 'function' ? def.label() : def.label;
      const inst: ButtonInst = { def, mesh, tex, canvas, lastActive: !def.isActive(), lastHover: false, lastLabel: lbl, cooldown: 0 };
      this.buttons.push(inst);
      this.draw(inst, def.isActive(), false, lbl);
    }
    this.deck.visible = false;

    this.lensRing = new Mesh(new RingGeometry(0.052, 0.056, 48), new MeshBasicMaterial({ color: MONO_DEEP_HEX, transparent: true, opacity: 0.62, side: DoubleSide, depthTest: false }));
    this.lensRing.renderOrder = 250;
    this.lensRing.visible = false;
    this.palmPlane = new Mesh(new PlaneGeometry(0.56, 0.56), new MeshBasicMaterial({ color: MONO_CORE_HEX, transparent: true, opacity: 0.13, side: DoubleSide, depthWrite: false }));
    this.palmPlane.visible = false;
  }

  public getButtonWorldPosition(id: string): Vector3 | null {
    const inst = this.buttons.find((b) => b.def.id === id);
    if (!inst) return null;
    return inst.mesh.getWorldPosition(new Vector3());
  }

  private reveal(mode: RevealMode): void {
    appState.revealMode = mode;
    this.audio.playSliceSweep();
    notifyStateChanged();
  }

  private draw(b: ButtonInst, active: boolean, hover: boolean, labelText?: string): void {
    const ctx = b.canvas.getContext('2d');
    if (!ctx) return;
    const lbl = labelText ?? (typeof b.def.label === 'function' ? b.def.label() : b.def.label);
    ctx.clearRect(0, 0, 256, 104);
    ctx.fillStyle = active ? '#0369a1' : hover ? '#e0f2fe' : 'rgba(255,255,255,0.96)';
    ctx.strokeStyle = active ? '#075985' : 'rgba(3,105,161,0.55)';
    ctx.lineWidth = active ? 4 : 2.5;
    ctx.beginPath();
    ctx.roundRect(6, 6, 244, 92, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = active ? '#ffffff' : '#0f172a';
    ctx.font = '600 26px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lbl, 128, 53);
    b.tex.needsUpdate = true;
    b.lastActive = active;
    b.lastHover = hover;
    b.lastLabel = lbl;
  }

  updatePlaque(_kicker: string, title: string, body: string, footer: string): void {
    const sig = `${title}|${body}|${footer}`;
    if (sig === this.plaqueSig) return;
    this.plaqueSig = sig;
    const ctx = this.plaqueCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 640, 320);
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.strokeStyle = 'rgba(3,105,161,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(6, 6, 628, 308, 20);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 30px Inter, system-ui, sans-serif';
    ctx.fillText(title.slice(0, 34), 30, 56);
    ctx.fillStyle = '#334155';
    ctx.font = '400 22px Inter, system-ui, sans-serif';
    let line = '';
    let y = 104;
    for (const w of body.split(' ')) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > 580) {
        ctx.fillText(line, 30, y);
        line = w;
        y += 31;
        if (y > 246) break;
      } else line = test;
    }
    if (line && y <= 246) ctx.fillText(line, 30, y);
    if (footer) {
      ctx.fillStyle = '#0369a1';
      ctx.font = '600 20px Inter, system-ui, sans-serif';
      ctx.fillText(footer.slice(0, 50), 30, 286);
    }
    this.plaqueTex.needsUpdate = true;
  }

  updatePokes(dt: number, tips: Vector3[]): void {
    const w = new Vector3();
    for (const b of this.buttons) {
      b.cooldown = Math.max(0, b.cooldown - dt);
      b.mesh.getWorldPosition(w);
      let d = Infinity;
      for (const t of tips) d = Math.min(d, t.distanceTo(w));
      const hover = d < 0.048;
      if (d < 0.022 && b.cooldown <= 0) {
        b.cooldown = 0.45;
        this.audio.playPokeClick(1.1);
        b.def.onTrigger();
      }
      b.mesh.position.z = hover ? (d < 0.022 ? -0.006 : 0.003) : 0;
      const active = b.def.isActive();
      const lbl = typeof b.def.label === 'function' ? b.def.label() : b.def.label;
      if (active !== b.lastActive || hover !== b.lastHover || lbl !== b.lastLabel) this.draw(b, active, hover, lbl);
    }
  }

  triggerButtonByMesh(obj: unknown): boolean {
    const id = (obj as Mesh | null)?.userData?.spatialButtonId;
    const b = id ? this.buttons.find((x) => x.def.id === id) : undefined;
    if (!b || b.cooldown > 0) return false;
    b.cooldown = 0.35;
    this.audio.playPokeClick(1.05);
    b.def.onTrigger();
    this.draw(b, b.def.isActive(), false);
    return true;
  }
}
