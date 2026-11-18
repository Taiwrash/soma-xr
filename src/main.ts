import { ReferenceSpaceType, SessionMode, World } from '@iwsdk/core';
import { SpatialAudioAndVoiceEngine } from './audio/spatialSynth';
import { SpatialLabelsOverlay } from './spatial/spatialLabelsOverlay';
import { WebcamMediaPipeTracker } from './tracking/webcamMediaPipeTracker';
import { setXRayMirrorBridge, XRayMirrorBridge, XRayMirrorSystem } from './systems/xrayMirrorSystem';
import { initHudController } from './ui/hudController';

async function bootstrap(): Promise<void> {
  const container = document.getElementById('scene-container') as HTMLElement;
  const labelsEl = document.getElementById('labels-overlay') as HTMLElement;
  const videoEl = document.getElementById('webcam-video') as HTMLVideoElement;

  const bridge: XRayMirrorBridge = {
    audio: new SpatialAudioAndVoiceEngine(),
    webcam: new WebcamMediaPipeTracker(videoEl),
    labelsOverlay: null as unknown as SpatialLabelsOverlay,
    recenterMirror: () => {},
    toggleDetachHologram: () => {},
    triggerStructureSelect: () => {},
    triggerVoiceOrTextAI: () => {},
    exitXRSession: () => {},
  };
  bridge.labelsOverlay = new SpatialLabelsOverlay(labelsEl, (info) => bridge.triggerStructureSelect(info));
  setXRayMirrorBridge(bridge);

  const xrFeatures = { handTracking: true, hitTest: true };
  const world = await World.create(container, {
    xr: {
      sessionMode: SessionMode.ImmersiveAR,
      offer: 'none',
      referenceSpace: { type: ReferenceSpaceType.LocalFloor, fallbackOrder: [ReferenceSpaceType.Local, ReferenceSpaceType.Viewer] },
      features: xrFeatures,
    },
    render: { fov: 40, near: 0.03, far: 40 },
    input: { canvasPointerEvents: false },
    features: {
      grabbing: { useHandPinchForGrab: true },
      spatialUI: false,
    },
  });
  world.renderer.setClearAlpha(0);
  world.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  world.registerSystem(XRayMirrorSystem);

  bridge.exitXRSession = () => {
    if (world.xrSession) world.exitXR();
  };

  // Clean pause / resume when tab is backgrounded or headset menu opens ("Easy to get into and out of")
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      bridge.audio.stopSpeaking();
      bridge.audio.updateLensProximityHum(0);
    }
  });

  initHudController(
    bridge,
    async () => {
      if (world.xrSession) {
        world.exitXR();
        return;
      }
      const xr = (navigator as Navigator & { xr?: { isSessionSupported: (m: string) => Promise<boolean> } }).xr;
      const supported = xr ? await xr.isSessionSupported('immersive-ar').catch(() => false) : false;
      if (!supported) {
        window.dispatchEvent(
          new CustomEvent('soma-toast', {
            detail: 'Mixed Reality needs Meta Quest Browser. On this device, explore in 3D or try the webcam mirror.',
          })
        );
        return;
      }
      try {
        await world.launchXR({ sessionMode: SessionMode.ImmersiveAR, features: xrFeatures });
      } catch {
        window.dispatchEvent(new CustomEvent('soma-toast', { detail: 'Could not start Mixed Reality. Put controllers down, allow hand tracking, and try again.' }));
      }
    },
    () => Boolean(world.xrSession)
  );
}

bootstrap().catch((err) => console.error('Soma XR failed to start:', err));
