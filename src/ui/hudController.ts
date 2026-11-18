import {
  ANATOMY_STRUCTURES,
  AnatomyStructureInfo,
  CLINICAL_CASES,
  PINPOINT_PROMPTS,
} from '../data/anatomyCatalog';
import {
  COACH_LANGUAGES,
  CoachLanguageCode,
  getCoachLanguageMeta,
  getCoachUIStrings,
  getLocalizedClinicalCase,
  getLocalizedPinpointClue,
  getLocalizedStructure,
  resolveMultilingualCoachQuery,
} from '../data/multilingualCoaching';
import {
  appState,
  applyLayerPreset,
  DEFAULT_FIT,
  LayerPreset,
  notifyStateChanged,
  ProductivityMode,
  RevealMode,
  savePersistedProgress,
  subscribeState,
  ViewFraming,
} from '../state/appState';
import { XRayMirrorBridge } from '../systems/xrayMirrorSystem';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

function syncSlider(el: HTMLInputElement, text: string): void {
  el.style.setProperty('--attr-min', el.min || '0');
  el.style.setProperty('--attr-max', el.max || '100');
  el.style.setProperty('--control-value', el.value);
  el.setAttribute('aria-valuetext', text);
}

export function initHudController(bridge: XRayMirrorBridge, onLaunchXR: () => void, isXR: () => boolean): void {
  const announcer = $('sr-announcer');
  let announceTimer = 0;
  const announce = (msg: string) => {
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => (announcer.textContent = msg), 150);
  };
  const click = (pitch = 1) => bridge.audio.playPokeClick(pitch);

  /* ---------------- non-blocking toast (unsupported device, permission denied) ---------------- */
  const toast = $('app-toast');
  let toastTimer = 0;
  const showToast = (msg: string) => {
    toast.textContent = msg;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (toast.hidden = true), 5200);
  };
  window.addEventListener('soma-toast', (ev) => showToast((ev as CustomEvent<string>).detail));

  /* ---------------- landing <-> studio navigation ---------------- */
  const landingView = $('landing-view');
  const studioHeader = $('studio-header');
  const studioToolbar = $('studio-stage-toolbar');
  const sidebarEl = $('sidebar');
  const landingHeading = $('landing-heading');
  const studioBrandTitle = $('studio-brand-title');

  const applyShellState = (enterStudio: boolean) => {
    appState.inStudio = enterStudio;
    document.body.classList.toggle('is-landing', !enterStudio);
    landingView.hidden = enterStudio;
    studioHeader.hidden = !enterStudio;
    studioToolbar.hidden = !enterStudio;
    sidebarEl.hidden = !enterStudio;
  };
  applyShellState(appState.inStudio);

  const navigateStudio = (enterStudio: boolean, pushHash = true) => {
    if (appState.inStudio === enterStudio) return;
    if (pushHash) {
      const nextUrl = enterStudio
        ? `${window.location.pathname}${window.location.search}#studio`
        : `${window.location.pathname}${window.location.search}`;
      window.history.pushState(null, '', nextUrl);
    }
    const finishFocus = () => {
      if (enterStudio) {
        bridge.recenterMirror();
        studioBrandTitle.focus({ preventScroll: true });
        announce('Soma XR Studio opened.');
      } else {
        landingHeading.focus({ preventScroll: true });
        announce('Soma XR home.');
      }
      notifyStateChanged();
    };
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };
    if (!doc.startViewTransition) {
      applyShellState(enterStudio);
      finishFocus();
      return;
    }
    const transition = doc.startViewTransition(() => {
      applyShellState(enterStudio);
    });
    transition.finished.finally(() => {
      finishFocus();
    });
  };

  $('btn-enter-studio').addEventListener('click', () => {
    click(1.1);
    navigateStudio(true);
  });
  $('btn-nav-studio').addEventListener('click', () => {
    click(1.1);
    navigateStudio(true);
  });
  $('btn-landing-mr').addEventListener('click', () => {
    click(1.15);
    navigateStudio(true);
    onLaunchXR();
  });
  $('btn-back-landing').addEventListener('click', () => {
    click(0.92);
    navigateStudio(false);
  });
  window.addEventListener('popstate', () => {
    const wantStudio = window.location.hash === '#studio' || new URLSearchParams(window.location.search).get('studio') === '1';
    navigateStudio(wantStudio, false);
  });

  /* ---------------- header ---------------- */
  const btnXR = $<HTMLButtonElement>('btn-launch-xr');
  btnXR.addEventListener('click', () => {
    click(1.15);
    onLaunchXR();
  });

  const btnWebcam = $<HTMLButtonElement>('btn-webcam');
  const webcamLabel = $('webcam-label');
  btnWebcam.addEventListener('click', async () => {
    click();
    if (bridge.webcam.isRunning) {
      bridge.webcam.stop();
      btnWebcam.setAttribute('aria-pressed', 'false');
      webcamLabel.textContent = 'Webcam';
      announce('Webcam off.');
    } else {
      webcamLabel.textContent = 'Starting…';
      btnWebcam.disabled = true;
      const ok = await bridge.webcam.start();
      btnWebcam.disabled = false;
      btnWebcam.setAttribute('aria-pressed', String(ok));
      webcamLabel.textContent = ok ? 'Stop webcam' : 'Webcam';
      if (ok) bridge.audio.enableMicrophoneJawTracking().catch(() => {});
      else showToast(bridge.webcam.statusMessage || 'Camera unavailable. Allow camera access to use the webcam mirror.');
      announce(ok ? 'Webcam mirror active.' : bridge.webcam.statusMessage);
    }
    notifyStateChanged();
  });

  const btnMute = $<HTMLButtonElement>('btn-mute');
  btnMute.addEventListener('click', () => {
    appState.audioMuted = !appState.audioMuted;
    bridge.audio.muted = appState.audioMuted;
    if (appState.audioMuted) bridge.audio.stopSpeaking();
    btnMute.setAttribute('aria-pressed', String(appState.audioMuted));
    ($('mute-wave') as unknown as SVGElement).style.display = appState.audioMuted ? 'none' : '';
  });

  /* ---------------- multilingual coach setup ---------------- */
  const selHeaderLang = $<HTMLSelectElement>('sel-header-lang');
  const inspectorLocalized = $('inspector-localized');
  const coachForm = $<HTMLFormElement>('coach-ask-form');
  const inpCoachAsk = $<HTMLInputElement>('inp-coach-ask');
  const lblCoachAsk = $('lbl-coach-ask');
  const btnCoachSend = $<HTMLButtonElement>('btn-coach-send');

  const grpAfrica = document.createElement('optgroup');
  grpAfrica.label = 'African languages';
  const grpWorld = document.createElement('optgroup');
  grpWorld.label = 'Popular world languages';
  for (const l of COACH_LANGUAGES) {
    const opt = document.createElement('option');
    opt.value = l.code;
    opt.lang = l.bcp47;
    opt.textContent = l.nativeName === l.englishName ? l.nativeName : `${l.nativeName} (${l.englishName})`;
    (l.group === 'africa' ? grpAfrica : grpWorld).appendChild(opt);
  }
  selHeaderLang.append(grpAfrica, grpWorld);

  const selectLanguage = (code: CoachLanguageCode, speakSample: boolean) => {
    appState.coachLanguage = code;
    appState.localize3DLabels = true;
    savePersistedProgress(appState);
    const meta = getCoachLanguageMeta(code);
    const activeBase = ANATOMY_STRUCTURES.find((s) => s.id === appState.selectedStructureId) ?? ANATOMY_STRUCTURES[0];
    const loc = getLocalizedStructure(activeBase, code);
    appState.aiLastTitle = loc.name;
    appState.aiLastAnswer = loc.summary;
    if (speakSample) {
      click(1.09);
      bridge.audio.speakExplanation(`${loc.name}. ${loc.summary}`, code);
    }
    announce(`${meta.englishName}. ${loc.name}.`);
    notifyStateChanged();
  };

  selHeaderLang.addEventListener('change', () => selectLanguage(selHeaderLang.value as CoachLanguageCode, true));

  const dlg = $<HTMLDialogElement>('gestures-dialog');
  $('btn-help').addEventListener('click', () => dlg.showModal());
  $('btn-close-help').addEventListener('click', () => {
    dlg.close();
    $('btn-help').focus();
  });
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dlg.addEventListener('click', (event) => {
      if (event.target !== dlg) return;
      const rect = dlg.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (isDialogContent) return;
      dlg.close();
    });
  }

  let hasCustomTutorAnswer = false;
  const tabs = document.querySelectorAll<HTMLButtonElement>('[data-mode-tab]');
  tabs.forEach((tab) =>
    tab.addEventListener('click', () => {
      const m = tab.dataset.modeTab as ProductivityMode;
      appState.productivityMode = m;
      if (m === 'detective') {
        appState.revealMode = 'lens';
        appState.caseScanProgress = 0;
      } else if (m === 'ai-tutor' && !hasCustomTutorAnswer) {
        const ui = getCoachUIStrings(appState.coachLanguage);
        appState.aiLastTitle = ui.welcomeTitle;
        appState.aiLastAnswer = ui.welcomeBody;
      }
      click(1.08);
      notifyStateChanged();
    })
  );

  /* ---------------- stage toolbar ---------------- */
  const framing = document.querySelectorAll<HTMLButtonElement>('[data-framing]');
  framing.forEach((b) =>
    b.addEventListener('click', () => {
      appState.viewFraming = b.dataset.framing as ViewFraming;
      click(1.04);
      notifyStateChanged();
    })
  );
  $('btn-reset-view').addEventListener('click', () => {
    appState.viewFraming = 'full';
    appState.detachedHologram = false;
    appState.explodedFactor = 0;
    appState.revealMode = 'whole';
    bridge.recenterMirror();
    notifyStateChanged();
  });

  /* ---------------- layers & display ---------------- */
  const presets = document.querySelectorAll<HTMLButtonElement>('[data-preset]');
  presets.forEach((b) =>
    b.addEventListener('click', () => {
      click(1.05);
      applyLayerPreset(b.dataset.preset as LayerPreset);
    })
  );
  const chkLabels = $<HTMLInputElement>('chk-labels');
  chkLabels.addEventListener('change', () => {
    appState.showLabels = chkLabels.checked;
    click(0.95);
    notifyStateChanged();
  });
  const chkSolid = $<HTMLInputElement>('chk-solid');
  chkSolid.addEventListener('change', () => {
    appState.lookMode = chkSolid.checked ? 'solid' : 'xray';
    click(0.95);
    notifyStateChanged();
  });

  const selReveal = $<HTMLSelectElement>('sel-reveal-mode');
  selReveal.addEventListener('change', () => {
    appState.revealMode = selReveal.value as RevealMode;
    bridge.audio.playSliceSweep();
    notifyStateChanged();
  });
  const btnPull = $<HTMLButtonElement>('btn-pull-out');
  btnPull.addEventListener('click', () => bridge.toggleDetachHologram());
  $('btn-reset-fit').addEventListener('click', () => {
    appState.fit = { ...DEFAULT_FIT };
    appState.brightness = 1;
    appState.realMeShowing = 0.3;
    notifyStateChanged();
  });

  const bind = (id: string, get: () => number, set: (v: number) => void, fmt: (v: number) => string) => {
    const el = $<HTMLInputElement>(id);
    const out = $(`val-${id.slice(3)}`);
    const refresh = () => {
      const v = get();
      if (document.activeElement !== el) el.value = String(v);
      out.textContent = fmt(Number(el.value));
      syncSlider(el, out.textContent);
    };
    el.addEventListener('input', () => {
      set(parseFloat(el.value));
      out.textContent = fmt(parseFloat(el.value));
      syncSlider(el, out.textContent);
      notifyStateChanged();
    });
    refresh();
    return refresh;
  };
  const pct = (v: number) => `${Math.round(v)}%`;
  const refreshers = [
    bind('sl-brightness', () => Math.round(appState.brightness * 100), (v) => (appState.brightness = v / 100), pct),
    bind('sl-real-me', () => Math.round(appState.realMeShowing * 100), (v) => (appState.realMeShowing = v / 100), pct),
    bind(
      'sl-lens-or-cut',
      () => (appState.revealMode === 'lens' ? Math.round(appState.lensSize * 100) : Math.round(appState.cutPosition * 100)),
      (v) => {
        if (appState.revealMode === 'lens') appState.lensSize = Math.max(0.06, v / 100);
        else appState.cutPosition = v / 100;
      },
      (v) => (appState.revealMode === 'lens' ? `${Math.round(v)} cm` : `${v > 0 ? '+' : ''}${Math.round(v)}%`)
    ),
    bind('sl-explode', () => Math.round(appState.explodedFactor * 100), (v) => (appState.explodedFactor = v / 100), pct),
    bind('sl-fit-overall', () => Math.round(appState.fit.overallSize * 100), (v) => (appState.fit.overallSize = v / 100), pct),
  ];

  /* ---------------- selection, quiz, voice ---------------- */
  bridge.triggerStructureSelect = (info: AnatomyStructureInfo) => {
    appState.selectedStructureId = info.id;
    click(1.18);
    const lang = appState.coachLanguage;
    const ui = getCoachUIStrings(lang);
    const loc = getLocalizedStructure(info, lang);
    if (appState.productivityMode === 'pinpoint') {
      const p = PINPOINT_PROMPTS[appState.pinpointIndex % PINPOINT_PROMPTS.length];
      if (info.id === p.structureId) {
        appState.pinpointScore += 10;
        appState.pinpointIndex = (appState.pinpointIndex + 1) % PINPOINT_PROMPTS.length;
        appState.masteryStreak += 1;
        savePersistedProgress(appState);
        bridge.audio.playSuccessChord();
        bridge.audio.speakExplanation(`${ui.correctPrefix}! ${loc.name}.`, lang);
        appState.aiLastTitle = `${ui.correctPrefix}: ${loc.name}`;
        appState.aiLastAnswer = loc.summary;
        announce(`${ui.correctPrefix}, ${loc.name}. +10.`);
      } else {
        const clue = getLocalizedPinpointClue(p, lang);
        appState.aiLastTitle = `${ui.tryAgainPrefix} ${loc.name}`;
        appState.aiLastAnswer = clue;
        bridge.audio.speakExplanation(`${ui.tryAgainPrefix} ${loc.name}.`, lang);
        announce(`${ui.tryAgainPrefix} ${loc.name}.`);
      }
    } else {
      appState.aiLastTitle = loc.name;
      appState.aiLastAnswer = loc.summary;
      if (lang !== 'en') {
        bridge.audio.speakExplanation(`${loc.name}. ${loc.summary}`, lang);
      }
      announce(`${loc.name}. ${loc.summary}`);
    }
    notifyStateChanged();
  };

  const handleQuery = (raw: string) => {
    const q = raw.toLowerCase().trim();
    if (!q) return;
    const lang = appState.coachLanguage;
    const say = (s: string) => bridge.audio.speakExplanation(s, lang);
    if (q.includes('left half')) return (appState.revealMode = 'left-half'), notifyStateChanged(), say('Left half.');
    if (q.includes('right half')) return (appState.revealMode = 'right-half'), notifyStateChanged(), say('Right half.');
    if (q.includes('solid')) return (appState.lookMode = 'solid'), notifyStateChanged();
    if (q.includes('x-ray') || q.includes('xray')) return (appState.lookMode = 'xray'), notifyStateChanged();

    const hovered = ANATOMY_STRUCTURES.find((s) => s.id === (appState.hoveredStructureId ?? appState.selectedStructureId)) ?? null;
    const intent = resolveMultilingualCoachQuery(raw, lang, hovered);
    if (intent.kind === 'preset') {
      applyLayerPreset(intent.preset);
      say(intent.spoken);
      return;
    }
    if (intent.kind === 'explode') {
      appState.explodedFactor = appState.explodedFactor > 0.2 ? 0 : 0.85;
      notifyStateChanged();
      say(intent.spoken);
      return;
    }
    hasCustomTutorAnswer = true;
    appState.selectedStructureId = intent.matchedStructure.id;
    appState.layers[intent.suggestedLayer] = true;
    appState.aiLastTitle = intent.title;
    appState.aiLastAnswer = intent.spokenText;
    say(intent.spokenText);
    announce(intent.spokenText);
    notifyStateChanged();
  };

  coachForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const val = inpCoachAsk.value.trim();
    if (!val) return;
    click(1.08);
    appState.productivityMode = 'ai-tutor';
    handleQuery(val);
    inpCoachAsk.value = '';
  });

  bridge.triggerVoiceOrTextAI = (prompt?: string) => {
    bridge.audio.enableMicrophoneJawTracking().catch(() => {});
    if (prompt) return handleQuery(prompt);
    type Rec = new () => {
      lang: string;
      interimResults: boolean;
      onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };
    const w = window as unknown as { SpeechRecognition?: Rec; webkitSpeechRecognition?: Rec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    const current = ANATOMY_STRUCTURES.find((s) => s.id === appState.selectedStructureId) ?? ANATOMY_STRUCTURES[0];
    if (!Ctor) return handleQuery(`how does the ${current.name} work`);
    try {
      const rec = new Ctor();
      rec.lang = getCoachLanguageMeta(appState.coachLanguage).bcp47;
      rec.interimResults = false;
      appState.voiceListening = true;
      notifyStateChanged();
      rec.onresult = (ev) => {
        appState.voiceListening = false;
        handleQuery(ev.results?.[0]?.[0]?.transcript ?? '');
      };
      rec.onerror = () => {
        appState.voiceListening = false;
        notifyStateChanged();
      };
      rec.onend = () => {
        appState.voiceListening = false;
        notifyStateChanged();
      };
      rec.start();
    } catch {
      appState.voiceListening = false;
      notifyStateChanged();
    }
  };
  const btnVoice = $<HTMLButtonElement>('btn-voice-ai');
  btnVoice.addEventListener('click', () => {
    click(1.12);
    bridge.triggerVoiceOrTextAI();
  });

  /* ---------------- inspector ---------------- */
  const title = $('context-title');
  const bodyEl = $('context-body');
  const actions = $('context-actions');
  const scanWrap = $('scan-progress-wrap');
  const scanBar = $<HTMLProgressElement>('scan-progress-bar');
  const rowLensCut = $('row-lens-cut');
  const slCut = $<HTMLInputElement>('sl-lens-or-cut');
  const lblCut = $('lbl-lens-or-cut');
  const xrLabel = $('xr-label');
  let actionKey = '';

  const mkBtn = (label: string, fn: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = label;
    b.addEventListener('click', fn);
    return b;
  };
  const rebuildActions = () => {
    actions.replaceChildren();
    const m = appState.productivityMode;
    const lang = appState.coachLanguage;
    const ui = getCoachUIStrings(lang);
    if (m === 'detective') {
      actions.append(
        mkBtn(ui.nextCaseBtn, () => {
          appState.activeCaseIndex = (appState.activeCaseIndex + 1) % CLINICAL_CASES.length;
          appState.caseScanProgress = 0;
          notifyStateChanged();
        }),
        mkBtn(ui.hearHintBtn, () => {
          const cs = CLINICAL_CASES[appState.activeCaseIndex % CLINICAL_CASES.length];
          bridge.audio.speakExplanation(getLocalizedClinicalCase(cs, appState.coachLanguage).hintSpoken, appState.coachLanguage);
        })
      );
    } else if (m === 'pinpoint') {
      actions.append(
        mkBtn(ui.skipBtn, () => {
          appState.pinpointIndex = (appState.pinpointIndex + 1) % PINPOINT_PROMPTS.length;
          notifyStateChanged();
        }),
        mkBtn(ui.speakBtn, () => {
          const p = PINPOINT_PROMPTS[appState.pinpointIndex % PINPOINT_PROMPTS.length];
          bridge.audio.speakExplanation(getLocalizedPinpointClue(p, appState.coachLanguage), appState.coachLanguage);
        })
      );
    } else {
      actions.append(
        mkBtn(ui.howItWorksBtn, () => bridge.triggerVoiceOrTextAI('work')),
        mkBtn(ui.clinicalNoteBtn, () => bridge.triggerVoiceOrTextAI('clinical')),
        mkBtn(ui.speakBtn, () => {
          const sel = ANATOMY_STRUCTURES.find((x) => x.id === (appState.hoveredStructureId ?? appState.selectedStructureId)) ?? ANATOMY_STRUCTURES[0];
          const loc = getLocalizedStructure(sel, appState.coachLanguage);
          bridge.audio.speakExplanation(`${loc.name}. ${loc.summary}`, appState.coachLanguage);
        })
      );
    }
  };

  subscribeState((s) => {
    applyShellState(s.inStudio);
    const langMeta = getCoachLanguageMeta(s.coachLanguage);
    const ui = getCoachUIStrings(s.coachLanguage);

    if (selHeaderLang.value !== s.coachLanguage) selHeaderLang.value = s.coachLanguage;
    inspectorLocalized.lang = langMeta.bcp47;
    inspectorLocalized.dir = langMeta.dir;
    inpCoachAsk.lang = langMeta.bcp47;
    inpCoachAsk.dir = langMeta.dir;
    inpCoachAsk.placeholder = ui.askPlaceholder;
    lblCoachAsk.textContent = ui.askInputLabel;
    btnCoachSend.textContent = ui.askSendBtn;

    xrLabel.textContent = isXR() ? 'Exit MR' : 'Enter MR';
    btnVoice.setAttribute('aria-pressed', String(s.voiceListening));
    tabs.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.modeTab === s.productivityMode)));
    framing.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.framing === s.viewFraming)));
    presets.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.preset === s.preset)));
    chkLabels.checked = s.showLabels;
    chkSolid.checked = s.lookMode === 'solid';

    if (selReveal.value !== s.revealMode) selReveal.value = s.revealMode;
    rowLensCut.hidden = s.revealMode === 'whole' || s.revealMode === 'palm-slicer';
    if (s.revealMode === 'lens') {
      lblCut.textContent = 'Lens size';
      slCut.min = '8';
      slCut.max = '40';
    } else {
      lblCut.textContent = 'Slice';
      slCut.min = '-95';
      slCut.max = '95';
    }
    btnPull.setAttribute('aria-pressed', String(s.detachedHologram));
    btnPull.textContent = s.detachedHologram ? 'Return to mirror' : 'Tabletop 3D view';
    for (const r of refreshers) r();

    scanWrap.hidden = s.productivityMode !== 'detective';
    if (s.productivityMode === 'detective') {
      const c = CLINICAL_CASES[s.activeCaseIndex % CLINICAL_CASES.length];
      const locCase = getLocalizedClinicalCase(c, s.coachLanguage);
      const solved = s.solvedCases.includes(c.id);
      title.textContent = solved ? `✓ ${locCase.title}` : locCase.title;
      bodyEl.textContent = solved ? locCase.bodySolved : locCase.bodyUnsolved;
      scanBar.value = Math.round(s.caseScanProgress);
      scanBar.textContent = `${Math.round(s.caseScanProgress)}%`;
    } else if (s.productivityMode === 'pinpoint') {
      const p = PINPOINT_PROMPTS[s.pinpointIndex % PINPOINT_PROMPTS.length];
      title.textContent = `${ui.quizTitle} (${s.pinpointScore} pts)`;
      bodyEl.textContent = getLocalizedPinpointClue(p, s.coachLanguage);
    } else if (s.productivityMode === 'ai-tutor') {
      title.textContent = s.aiLastTitle;
      bodyEl.textContent = s.aiLastAnswer;
    } else {
      const sel = ANATOMY_STRUCTURES.find((x) => x.id === (s.hoveredStructureId ?? s.selectedStructureId)) ?? ANATOMY_STRUCTURES[0];
      const loc = getLocalizedStructure(sel, s.coachLanguage);
      title.textContent = loc.name;
      bodyEl.textContent = `${loc.summary} ${loc.biomechanics}`;
    }
    const key = `${s.productivityMode}|${s.coachLanguage}`;
    if (key !== actionKey) {
      actionKey = key;
      rebuildActions();
    }
  });

  notifyStateChanged();
}
