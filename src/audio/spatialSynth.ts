import {
  cleanSpokenTextForLanguage,
  coachAudioClipHash,
  CoachLanguageCode,
  CoachLanguageMeta,
  getCoachLanguageMeta,
} from '../data/multilingualCoaching';
import { appState } from '../state/appState';

/**
 * Procedural Spatial Audio, Multilingual Neural/Web-Speech Coach & Live Vocal Jaw Envelope Engine
 * - Synthesizes crisp, non-fatiguing UI pokes, X-Ray lens hums, slice sweeps, and mastery chords.
 * - Extracts live RMS/formant energy from user's microphone OR active Coach TTS audio to drive real-time 3D TMJ jaw articulation!
 */
export class SpatialAudioAndVoiceEngine {
  private ctx: AudioContext | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micData: Uint8Array<ArrayBuffer> | null = null;
  private micStream: MediaStream | null = null;
  private ttsAudio: HTMLAudioElement | null = null;
  private ttsAnalyser: AnalyserNode | null = null;
  private ttsData: Uint8Array<ArrayBuffer> | null = null;
  private ttsPlaying = false;
  private synthSpeaking = false;
  private ttsBlobCache = new Map<string, string>();
  private bundledManifest: Set<string> | null = null;
  private bundledManifestPromise: Promise<Set<string>> | null = null;
  private ttsAbort: AbortController | null = null;
  private smoothedJaw = 0;
  private lensHumOsc: OscillatorNode | null = null;
  private lensHumGain: GainNode | null = null;
  public muted = false;
  public micActive = false;

  ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  async enableMicrophoneJawTracking(): Promise<boolean> {
    if (this.micActive) return true;
    try {
      const ctx = this.ensureContext();
      if (!ctx || !navigator.mediaDevices?.getUserMedia) return false;
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      const source = ctx.createMediaStreamSource(this.micStream);
      this.micAnalyser = ctx.createAnalyser();
      this.micAnalyser.fftSize = 256;
      this.micAnalyser.smoothingTimeConstant = 0.65;
      source.connect(this.micAnalyser);
      this.micData = new Uint8Array(this.micAnalyser.frequencyBinCount);
      this.micActive = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns normalized [0..1] jaw openness estimated from vocal formant bands (150 Hz - 1400 Hz)
   * from either the user's live microphone OR the speaking Multilingual Anatomy Coach!
   */
  sampleMicJawOpenness(dt: number): number {
    let target = 0;
    if (this.micActive && this.micAnalyser && this.micData) {
      this.micAnalyser.getByteFrequencyData(this.micData);
      let sum = 0;
      const startBin = 2;
      const endBin = Math.min(20, this.micData.length);
      for (let i = startBin; i < endBin; i++) sum += this.micData[i];
      const avg = sum / ((endBin - startBin) * 255);
      target = Math.max(target, Math.min(1, Math.max(0, (avg - 0.08) * 2.8)));
    }
    if (this.ttsPlaying && this.ttsAnalyser && this.ttsData) {
      this.ttsAnalyser.getByteFrequencyData(this.ttsData);
      let sum = 0;
      const startBin = 2;
      const endBin = Math.min(22, this.ttsData.length);
      for (let i = startBin; i < endBin; i++) sum += this.ttsData[i];
      const avg = sum / ((endBin - startBin) * 255);
      target = Math.max(target, Math.min(1, Math.max(0, (avg - 0.05) * 2.6)));
    } else if (this.synthSpeaking) {
      const t = performance.now() * 0.001;
      target = Math.max(target, 0.22 + 0.35 * Math.abs(Math.sin(t * 11.5)) * (0.5 + 0.5 * Math.sin(t * 3.7)));
    }

    if (dt <= 0) return this.smoothedJaw;
    if (target <= 0.001) {
      this.smoothedJaw *= Math.exp(-dt * 10);
      return this.smoothedJaw;
    }
    const rate = target > this.smoothedJaw ? 22 : 11;
    this.smoothedJaw += (target - this.smoothedJaw) * (1 - Math.exp(-dt * rate));
    return this.smoothedJaw;
  }

  public get hasActiveCoachVoice(): boolean {
    return this.ttsPlaying || this.synthSpeaking;
  }

  playBootChime(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [392.0, 587.33, 783.99, 1174.66];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.075);
      gain.gain.setValueAtTime(0.0001, now + idx * 0.075);
      gain.gain.exponentialRampToValueAtTime(0.045, now + idx * 0.075 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.075 + 0.55);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + idx * 0.075);
      osc.stop(now + idx * 0.075 + 0.6);
    });
  }

  playPokeClick(pitchMultiplier = 1.0): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680 * pitchMultiplier, now);
    osc.frequency.exponentialRampToValueAtTime(320 * pitchMultiplier, now + 0.038);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  playSliceSweep(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  playSuccessChord(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.055);
      gain.gain.setValueAtTime(0.0001, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.055, now + i * 0.055 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.055 + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.5);
    });
  }

  updateLensProximityHum(intensity01: number): void {
    if (this.muted || intensity01 <= 0.02) {
      if (this.lensHumGain && this.ctx) {
        this.lensHumGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
      }
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (!this.lensHumOsc || !this.lensHumGain) {
      this.lensHumOsc = ctx.createOscillator();
      this.lensHumGain = ctx.createGain();
      this.lensHumOsc.type = 'sine';
      this.lensHumOsc.frequency.value = 148;
      this.lensHumGain.gain.value = 0.0001;
      this.lensHumOsc.connect(this.lensHumGain).connect(ctx.destination);
      this.lensHumOsc.start();
    }
    const clamped = Math.min(1, Math.max(0, intensity01));
    this.lensHumOsc.frequency.setTargetAtTime(135 + clamped * 95, ctx.currentTime, 0.06);
    this.lensHumGain.gain.setTargetAtTime(clamped * 0.022, ctx.currentTime, 0.06);
  }

  stopSpeaking(): void {
    this.ttsAbort?.abort();
    this.ttsAbort = null;
    if (this.ttsAudio) {
      this.ttsAudio.pause();
      this.ttsAudio.currentTime = 0;
    }
    this.ttsPlaying = false;
    this.synthSpeaking = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
  }

  private ensureTtsAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    const ctx = this.ensureContext();
    if (!this.ttsAudio) {
      this.ttsAudio = new Audio();
      this.ttsAudio.preload = 'auto';
      this.ttsAudio.addEventListener('ended', () => {
        this.ttsPlaying = false;
      });
      this.ttsAudio.addEventListener('pause', () => {
        this.ttsPlaying = false;
      });
      if (ctx) {
        try {
          const src = ctx.createMediaElementSource(this.ttsAudio);
          this.ttsAnalyser = ctx.createAnalyser();
          this.ttsAnalyser.fftSize = 256;
          this.ttsAnalyser.smoothingTimeConstant = 0.6;
          src.connect(this.ttsAnalyser);
          this.ttsAnalyser.connect(ctx.destination);
          this.ttsData = new Uint8Array(this.ttsAnalyser.frequencyBinCount);
        } catch {
          /* fallback direct audio output */
        }
      }
    }
    return this.ttsAudio;
  }

  private getBaseUrl(): string {
    const b = import.meta.env.BASE_URL || './';
    return b.endsWith('/') ? b : `${b}/`;
  }

  private loadBundledManifest(): Promise<Set<string>> {
    if (this.bundledManifest) return Promise.resolve(this.bundledManifest);
    if (this.bundledManifestPromise) return this.bundledManifestPromise;
    this.bundledManifestPromise = fetch(`${this.getBaseUrl()}audio/coach/manifest.json`)
      .then(async (r) => {
        if (!r.ok) return new Set<string>();
        const list = (await r.json()) as string[];
        const s = new Set<string>(Array.isArray(list) ? list : []);
        this.bundledManifest = s;
        return s;
      })
      .catch(() => {
        const empty = new Set<string>();
        this.bundledManifest = empty;
        return empty;
      });
    return this.bundledManifestPromise;
  }

  private speakFallbackBrowser(text: string, meta: CoachLanguageMeta): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const voices = window.speechSynthesis.getVoices();
      const lower = meta.bcp47.toLowerCase();
      const primary = lower.split('-')[0];
      const exactMatch =
        voices.find((v) => v.lang.toLowerCase() === lower) ??
        voices.find((v) => v.lang.toLowerCase().startsWith(`${primary}-`) || v.lang.toLowerCase() === primary);

      // Never allow an English/default OS voice to read tonal African or non-Latin languages as gibberish
      if (!exactMatch && !meta.allowBrowserSpeechFallback) {
        return;
      }

      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = meta.bcp47;
      if (exactMatch) utter.voice = exactMatch;
      utter.rate = 0.98;
      utter.pitch = 0.96;
      utter.onstart = () => {
        this.synthSpeaking = true;
      };
      utter.onend = () => {
        this.synthSpeaking = false;
      };
      utter.onerror = () => {
        this.synthSpeaking = false;
      };
      window.speechSynthesis.speak(utter);
    } catch {
      this.synthSpeaking = false;
    }
  }

  speakExplanation(text: string, langOverride?: CoachLanguageCode): void {
    if (this.muted || typeof window === 'undefined' || !text.trim()) return;
    this.stopSpeaking();
    const lang = langOverride ?? appState.coachLanguage;
    const meta = getCoachLanguageMeta(lang);
    const cleaned = cleanSpokenTextForLanguage(text, lang);
    if (!cleaned) return;
    const cacheKey = `${meta.edgeVoice}|${lang}|${cleaned}`;

    const playUrl = async (url: string): Promise<boolean> => {
      const el = this.ensureTtsAudioElement();
      if (!el) return false;
      el.src = url;
      this.ttsPlaying = true;
      try {
        await el.play();
        return true;
      } catch {
        this.ttsPlaying = false;
        return false;
      }
    };

    const cached = this.ttsBlobCache.get(cacheKey);
    if (cached) {
      playUrl(cached).then((ok) => {
        if (!ok) this.speakFallbackBrowser(cleaned, meta);
      });
      return;
    }

    const ctrl = new AbortController();
    this.ttsAbort = ctrl;
    const clipKey = `${lang}/${coachAudioClipHash(lang, cleaned)}`;

    this.loadBundledManifest().then(async (manifest) => {
      if (ctrl.signal.aborted || this.muted) return;

      // 1. Instant pre-bundled native neural audio clip (works offline & on GitHub Pages subpath hosts)
      const baseUrl = this.getBaseUrl();
      if (manifest.has(clipKey)) {
        const staticUrl = `${baseUrl}audio/coach/${clipKey}.mp3`;
        this.ttsBlobCache.set(cacheKey, staticUrl);
        const ok = await playUrl(staticUrl);
        if (ok || ctrl.signal.aborted) return;
      }

      // 2. Live neural synthesis (/api/coach-tts — native MMS-TTS for Yorùbá/Hausa/Igbo, Edge Neural for others)
      const timer = window.setTimeout(() => ctrl.abort(), 9000);
      const qs = new URLSearchParams({
        voice: meta.edgeVoice,
        lang,
        text: cleaned.slice(0, 520),
      });
      try {
        const res = await fetch(`${baseUrl}api/coach-tts?${qs.toString()}`, { signal: ctrl.signal });
        window.clearTimeout(timer);
        if (!res.ok || !(res.headers.get('content-type') ?? '').includes('audio')) {
          throw new Error('tts endpoint unavailable');
        }
        const blob = await res.blob();
        if (blob.size < 256) throw new Error('empty audio');
        const url = URL.createObjectURL(blob);
        this.ttsBlobCache.set(cacheKey, url);
        if (ctrl.signal.aborted || this.muted) return;
        const ok = await playUrl(url);
        if (!ok) this.speakFallbackBrowser(cleaned, meta);
      } catch {
        window.clearTimeout(timer);
        if (!ctrl.signal.aborted && !this.muted) {
          this.speakFallbackBrowser(cleaned, meta);
        }
      }
    });
  }
}
