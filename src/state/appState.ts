import type { LayerKey } from '../anatomy/proceduralAnatomyBuilder';
import type { CoachLanguageCode } from '../data/multilingualCoaching';

export type LayerPreset = 'radiograph' | 'skeleton' | 'organs' | 'muscles' | 'everything' | 'custom';
export type LookMode = 'xray' | 'solid';
export type ViewFraming = 'full' | 'torso' | 'head';
export type RevealMode = 'whole' | 'lens' | 'left-half' | 'right-half' | 'upper-cut' | 'lower-cut' | 'palm-slicer';
export type ProductivityMode = 'explore' | 'pinpoint' | 'detective' | 'ai-tutor';
export type RuntimeTrackingMode = 'quest-webxr' | 'webcam-mediapipe' | 'interactive-3d';

export interface BodyFitCalibration {
  overallSize: number;
  width: number;
  height: number;
  depth: number;
  leftRightCm: number;
  upDownCm: number;
  forwardBackCm: number;
}

export interface TrackingTelemetry {
  runtimeMode: RuntimeTrackingMode;
  bodyStatus: string;
  distanceCm: number;
  yawDeg: number;
  pitchDeg: number;
  rollDeg: number;
  jawOpenPct: number;
  heartRateBpm: number;
  breathsPerMin: number;
  handsStatus: string;
  indexFingertip: [number, number, number];
  activeLayersList: string;
  drawCalls: number;
  fps: number;
}

export interface AppState {
  inStudio: boolean;
  viewFraming: ViewFraming;
  preset: LayerPreset;
  layers: Record<LayerKey, boolean>;
  showLabels: boolean;
  lookMode: LookMode;
  brightness: number;
  realMeShowing: number;
  edgeFeather: number;
  revealMode: RevealMode;
  lensSize: number;
  cutPosition: number;
  explodedFactor: number;
  detachedHologram: boolean;
  detachedScale: number;
  showTrackingData: boolean;
  fit: BodyFitCalibration;
  productivityMode: ProductivityMode;
  selectedStructureId: string | null;
  hoveredStructureId: string | null;
  activeCaseIndex: number;
  solvedCases: string[];
  caseScanProgress: number;
  pinpointIndex: number;
  pinpointScore: number;
  masteryStreak: number;
  aiLastTitle: string;
  aiLastAnswer: string;
  coachLanguage: CoachLanguageCode;
  localize3DLabels: boolean;
  voiceListening: boolean;
  audioMuted: boolean;
  telemetry: TrackingTelemetry;
}

const STORAGE_KEY = 'xray_mirror_mr_v3';

function loadProgress(): { solvedCases: string[]; masteryStreak: number; pinpointScore: number; coachLanguage: CoachLanguageCode } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        solvedCases: Array.isArray(p.solvedCases) ? p.solvedCases : [],
        masteryStreak: typeof p.masteryStreak === 'number' ? p.masteryStreak : 0,
        pinpointScore: typeof p.pinpointScore === 'number' ? p.pinpointScore : 0,
        coachLanguage: typeof p.coachLanguage === 'string' ? (p.coachLanguage as CoachLanguageCode) : 'en',
      };
    }
  } catch {
    /* storage unavailable */
  }
  return { solvedCases: [], masteryStreak: 0, pinpointScore: 0, coachLanguage: 'en' };
}

export function savePersistedProgress(s: AppState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        solvedCases: s.solvedCases,
        masteryStreak: s.masteryStreak,
        pinpointScore: s.pinpointScore,
        coachLanguage: s.coachLanguage,
      })
    );
  } catch {
    /* storage unavailable */
  }
}

export const DEFAULT_FIT: BodyFitCalibration = {
  overallSize: 1,
  width: 1,
  height: 1,
  depth: 1,
  leftRightCm: 0,
  upDownCm: 0,
  forwardBackCm: 0,
};

const persisted = typeof window !== 'undefined' ? loadProgress() : { solvedCases: [], masteryStreak: 0, pinpointScore: 0, coachLanguage: 'en' as CoachLanguageCode };

const initialInStudio =
  typeof window !== 'undefined' &&
  (window.location.hash === '#studio' || new URLSearchParams(window.location.search).get('studio') === '1');

export const appState: AppState = {
  inStudio: initialInStudio,
  viewFraming: 'full',
  preset: 'radiograph',
  layers: { skeleton: true, organs: true, muscles: false, skin: true },
  showLabels: true,
  lookMode: 'xray',
  brightness: 1,
  realMeShowing: 0.3,
  edgeFeather: 0.17,
  revealMode: 'whole',
  lensSize: 0.18,
  cutPosition: 0,
  explodedFactor: 0,
  detachedHologram: false,
  detachedScale: 1,
  showTrackingData: false,
  fit: { ...DEFAULT_FIT },
  productivityMode: 'explore',
  selectedStructureId: 'heart',
  hoveredStructureId: null,
  activeCaseIndex: 0,
  solvedCases: persisted.solvedCases,
  caseScanProgress: 0,
  pinpointIndex: 0,
  pinpointScore: persisted.pinpointScore,
  masteryStreak: persisted.masteryStreak,
  aiLastTitle: 'Ask about any structure',
  aiLastAnswer: 'Click or point at a bone or organ, then ask a question by voice or with the buttons below.',
  coachLanguage: persisted.coachLanguage,
  localize3DLabels: true,
  voiceListening: false,
  audioMuted: false,
  telemetry: {
    runtimeMode: 'interactive-3d',
    bodyStatus: '3D studio',
    distanceCm: 0,
    yawDeg: 0,
    pitchDeg: 0,
    rollDeg: 0,
    jawOpenPct: 0,
    heartRateBpm: 72,
    breathsPerMin: 14,
    handsStatus: '—',
    indexFingertip: [0.5, 0.5, 0],
    activeLayersList: '',
    drawCalls: 0,
    fps: 0,
  },
};

type Listener = (s: AppState) => void;
const listeners = new Set<Listener>();
export function subscribeState(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function notifyStateChanged(): void {
  listeners.forEach((fn) => fn(appState));
}

export function applyLayerPreset(preset: LayerPreset): void {
  appState.preset = preset;
  const L = appState.layers;
  if (preset === 'radiograph') Object.assign(L, { skeleton: true, organs: true, muscles: false, skin: true });
  else if (preset === 'skeleton') Object.assign(L, { skeleton: true, organs: false, muscles: false, skin: true });
  else if (preset === 'organs') Object.assign(L, { skeleton: false, organs: true, muscles: false, skin: true });
  else if (preset === 'muscles') Object.assign(L, { skeleton: true, organs: false, muscles: true, skin: true });
  else if (preset === 'everything') Object.assign(L, { skeleton: true, organs: true, muscles: true, skin: true });
  notifyStateChanged();
}
