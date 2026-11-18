import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  LinearFilter,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
  Vector4,
} from '@iwsdk/core';
import { ANATOMY_STRUCTURES, AnatomyStructureInfo } from '../data/anatomyCatalog';
import { getCoachLanguageMeta, getLocalizedStructureName } from '../data/multilingualCoaching';
import type { BodyRig } from '../anatomy/proceduralAnatomyBuilder';
import { appState } from '../state/appState';
import { MONO_CORE_HEX } from '../shaders/xrayMaterial';

interface LabelNode {
  info: AnatomyStructureInfo;
  btn: HTMLButtonElement;
  path: SVGPathElement;
  dot: SVGCircleElement;
  sprite: Sprite;
  spriteCanvas: HTMLCanvasElement;
  spriteTex: CanvasTexture;
  spriteText: string;
  anchor: Vector3;
  width: number;
  text: string;
}

export interface StageRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const EXPLODE: Record<string, [number, number]> = { organs: [-0.46, 0.02], muscles: [0.46, 0.02] };

export class SpatialLabelsOverlay {
  public readonly group3D = new Group();
  private svg: SVGSVGElement;
  private container: HTMLElement;
  private nodes: LabelNode[] = [];
  private lineGeo: BufferGeometry;
  private linePos: Float32Array;
  private onSelect: (info: AnatomyStructureInfo) => void;

  constructor(container: HTMLElement, onSelect: (info: AnatomyStructureInfo) => void) {
    this.container = container;
    this.onSelect = onSelect;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('aria-hidden', 'true');
    this.svg.classList.add('labels-svg');
    container.appendChild(this.svg);

    this.linePos = new Float32Array(ANATOMY_STRUCTURES.length * 6);
    this.lineGeo = new BufferGeometry();
    this.lineGeo.setAttribute('position', new BufferAttribute(this.linePos, 3));
    this.group3D.add(new LineSegments(this.lineGeo, new LineBasicMaterial({ color: MONO_CORE_HEX, transparent: true, opacity: 0.8, depthTest: false })));

    for (const info of ANATOMY_STRUCTURES) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.classList.add('leader');
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '2.6');
      dot.classList.add('leader-dot');
      this.svg.append(path, dot);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'anatomy-callout';
      btn.textContent = info.name;
      btn.addEventListener('click', () => this.onSelect(info));
      btn.addEventListener('pointerenter', () => {
        appState.hoveredStructureId = info.id;
      });
      btn.addEventListener('pointerleave', () => {
        if (appState.hoveredStructureId === info.id) appState.hoveredStructureId = null;
      });
      container.appendChild(btn);
      const { sprite, canvas, tex } = this.makeSprite(info.name);
      this.group3D.add(sprite);
      this.nodes.push({ info, btn, path, dot, sprite, spriteCanvas: canvas, spriteTex: tex, spriteText: info.name, anchor: new Vector3(), width: 0, text: info.name });
    }
  }

  private drawSpriteLabel(c: HTMLCanvasElement, tex: CanvasTexture, text: string, dir: 'ltr' | 'rtl' = 'ltr'): void {
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.direction = dir;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(4, 8, 352, 48, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 21px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.slice(0, 28), 180, 33);
    tex.needsUpdate = true;
  }

  private makeSprite(text: string): { sprite: Sprite; canvas: HTMLCanvasElement; tex: CanvasTexture } {
    const c = document.createElement('canvas');
    c.width = 360;
    c.height = 64;
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    this.drawSpriteLabel(c, tex, text);
    const s = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    s.scale.set(0.17, 0.03, 1);
    s.renderOrder = 300;
    s.visible = false;
    return { sprite: s, canvas: c, tex };
  }

  private hide(n: LabelNode): void {
    n.btn.style.display = 'none';
    n.path.style.display = 'none';
    n.dot.style.display = 'none';
    n.sprite.visible = false;
  }

  update(
    camera: PerspectiveCamera,
    rig: BodyRig,
    hands: [ReadonlyMap<string, Vector3> | null, ReadonlyMap<string, Vector3> | null],
    isXR: boolean,
    stage: StageRect,
    reveal: { mode: number; plane: Vector4 }
  ): void {
    const show = appState.showLabels && (appState.inStudio || isXR);
    this.container.style.display = show && !isXR ? 'block' : 'none';
    this.group3D.visible = show && isXR;
    if (!show) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const e = appState.explodedFactor;
    const proj = new Vector3();
    const all: Array<{ n: LabelNode; ax: number; ay: number }> = [];
    let line = 0;

    for (const n of this.nodes) {
      const { info } = n;
      if (!appState.layers[info.layer]) {
        this.hide(n);
        continue;
      }
      if (info.attach === 'hand-L' || info.attach === 'hand-R') {
        const map = hands[info.attach === 'hand-L' ? 0 : 1];
        const p = info.handJoint ? map?.get(info.handJoint) : undefined;
        if (!p) {
          this.hide(n);
          continue;
        }
        n.anchor.copy(p);
      } else {
        const node = rig.nodes[info.attach];
        const ex = EXPLODE[info.layer];
        n.anchor.set(info.local[0] + (ex ? ex[0] * e : 0), info.local[1], info.local[2] + (ex ? ex[1] * e : 0));
        node.localToWorld(n.anchor);
      }
      if (reveal.mode > 1.5) {
        const sd = reveal.plane.x * n.anchor.x + reveal.plane.y * n.anchor.y + reveal.plane.z * n.anchor.z + reveal.plane.w;
        if (sd < -0.01) {
          this.hide(n);
          continue;
        }
      }

      // On phones/tablets, only the focused structure gets a callout so the body stays readable
      if (!isXR && (window.innerWidth <= 960 || window.innerHeight < 560)) {
        const focusedId = appState.hoveredStructureId ?? appState.selectedStructureId;
        if (info.id !== focusedId) {
          this.hide(n);
          continue;
        }
      }
      if (isXR) {
        // Keep Mixed Reality spacious & clutter-free: only float a 3D callout on the focused/hovered structure
        const focusedId = appState.hoveredStructureId ?? appState.selectedStructureId;
        if (info.id !== focusedId || appState.productivityMode === 'pinpoint') {
          this.hide(n);
          continue;
        }
        const langMeta = getCoachLanguageMeta(appState.coachLanguage);
        const spLabel = appState.localize3DLabels ? getLocalizedStructureName(info.id, appState.coachLanguage) : info.name;
        if (spLabel !== n.spriteText) {
          this.drawSpriteLabel(n.spriteCanvas, n.spriteTex, spLabel, langMeta.dir);
          n.spriteText = spLabel;
        }
        const bodyScale = rig.root.getWorldScale(new Vector3()).y;
        const side = n.anchor.x < rig.root.getWorldPosition(proj).x ? -1 : 1;
        const out = n.anchor.clone().add(new Vector3(side * 0.22 * bodyScale, 0.02 * bodyScale, 0.03));
        n.sprite.scale.set(0.16 * Math.max(0.65, bodyScale), 0.028 * Math.max(0.65, bodyScale), 1);
        n.sprite.visible = true;
        n.sprite.position.copy(out);
        this.linePos.set([n.anchor.x, n.anchor.y, n.anchor.z, out.x, out.y, out.z], line * 6);
        line++;
        continue;
      }

      proj.copy(n.anchor).project(camera);
      const ax = (proj.x * 0.5 + 0.5) * W;
      const ay = (-proj.y * 0.5 + 0.5) * H;
      if (proj.z > 1 || ax < stage.left + 8 || ax > stage.right - 8 || ay < stage.top || ay > stage.bottom) {
        this.hide(n);
        continue;
      }
      all.push({ n, ax, ay });
    }

    if (isXR) {
      this.linePos.fill(0, line * 6);
      this.lineGeo.attributes.position.needsUpdate = true;
      this.lineGeo.setDrawRange(0, line * 2);
      return;
    }

    const rootW = rig.root.getWorldPosition(new Vector3());
    const headW = rig.nodes.head.localToWorld(new Vector3(0, 0.2, 0));
    const pr = rootW.clone().project(camera);
    const ph = headW.clone().project(camera);
    const cx = (pr.x * 0.5 + 0.5) * W;
    const bodyPx = Math.abs(((-ph.y * 0.5 + 0.5) - (-pr.y * 0.5 + 0.5)) * H);
    const off = Math.min(285, Math.max(155, bodyPx * 0.62));
    const leftX = Math.max(stage.left + 140, cx - off);
    const rightX = Math.min(stage.right - 140, cx + off);
    const left = all.filter((it) => it.ax < cx);
    const right = all.filter((it) => it.ax >= cx);
    this.layout(left, leftX, -1, stage);
    this.layout(right, rightX, 1, stage);
  }

  private layout(items: Array<{ n: LabelNode; ax: number; ay: number }>, edgeX: number, dir: -1 | 1, stage: StageRect): void {
    const gap = 28;
    items.sort((a, b) => a.ay - b.ay);
    const ys = items.map((it) => it.ay);
    for (let i = 0; i < ys.length; i++) ys[i] = Math.max(ys[i], i === 0 ? stage.top + 16 : ys[i - 1] + gap);
    for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.min(ys[i], i === ys.length - 1 ? stage.bottom - 16 : ys[i + 1] - gap);
    for (let i = 0; i < ys.length; i++) ys[i] = Math.max(ys[i], i === 0 ? stage.top + 16 : ys[i - 1] + gap);

    const langMeta = getCoachLanguageMeta(appState.coachLanguage);
    const useLoc = appState.localize3DLabels;

    items.forEach((it, i) => {
      const { n, ax, ay } = it;
      const quiz = appState.productivityMode === 'pinpoint';
      const displayLabel = useLoc ? getLocalizedStructureName(n.info.id, appState.coachLanguage) : n.info.name;
      const text = quiz ? '?' : displayLabel;
      if (text !== n.text) {
        n.btn.textContent = text;
        n.text = text;
        n.width = 0;
      }
      n.btn.lang = useLoc ? langMeta.bcp47 : 'en';
      n.btn.dir = useLoc ? langMeta.dir : 'ltr';
      n.btn.setAttribute('aria-label', quiz ? `Unknown structure ${i + 1}` : displayLabel);
      n.btn.style.display = 'block';
      if (!n.width) n.width = n.btn.offsetWidth || 120;
      const hi = appState.selectedStructureId === n.info.id || appState.hoveredStructureId === n.info.id;
      n.btn.classList.toggle('is-highlighted', hi);

      // Compact mobile/short-screen pin: keep long multilingual labels (e.g. Yorùbá/Hausa) cleanly inside stage bounds
      const stageW = stage.right - stage.left;
      if (stageW <= 640 || window.innerHeight < 560) {
        const halfW = Math.min(n.width / 2, stageW / 2 - 12);
        const cxMobile = Math.max(stage.left + 12 + halfW, Math.min(stage.right - 12 - halfW, ax));
        const above = ay > stage.top + 52;
        const lyMobile = above
          ? Math.max(stage.top + 18, ay - 34)
          : Math.min(stage.bottom - 18, ay + 34);
        const tipY = above ? lyMobile + 13 : lyMobile - 13;
        n.btn.style.left = `${cxMobile.toFixed(1)}px`;
        n.btn.style.top = `${lyMobile.toFixed(1)}px`;
        n.path.style.display = 'block';
        n.path.setAttribute('d', `M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${cxMobile.toFixed(1)} ${tipY.toFixed(1)}`);
        n.path.classList.toggle('is-highlighted', hi);
        n.dot.style.display = 'block';
        n.dot.setAttribute('cx', ax.toFixed(1));
        n.dot.setAttribute('cy', ay.toFixed(1));
        n.dot.classList.toggle('is-highlighted', hi);
        return;
      }

      const ly = ys[i];
      // edgeX is the label edge nearest the body; clamp so the pill never leaves the stage
      const nearEdge =
        dir < 0
          ? Math.max(stage.left + 12 + n.width, edgeX)
          : Math.min(stage.right - 12 - n.width, edgeX);
      const cxLabel = dir < 0 ? nearEdge - n.width / 2 : nearEdge + n.width / 2;
      n.btn.style.left = `${cxLabel}px`;
      n.btn.style.top = `${ly}px`;
      const elbowX = nearEdge - dir * 18;
      n.path.style.display = 'block';
      n.path.setAttribute('d', `M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${elbowX.toFixed(1)} ${ly.toFixed(1)} L ${nearEdge.toFixed(1)} ${ly.toFixed(1)}`);
      n.path.classList.toggle('is-highlighted', hi);
      n.dot.style.display = 'block';
      n.dot.setAttribute('cx', ax.toFixed(1));
      n.dot.setAttribute('cy', ay.toFixed(1));
      n.dot.classList.toggle('is-highlighted', hi);
    });
  }
}
