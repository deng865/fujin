type BrowserWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

type ToneOptions = {
  durationMs: number;
  frequency: number;
  type?: OscillatorType;
  volume?: number;
};

let sharedAudioContext: AudioContext | null = null;
let unlockListenersAttached = false;

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const getAudioContext = () => {
  if (typeof window === "undefined") return null;

  const browserWindow = window as BrowserWindow;
  const AudioContextCtor = browserWindow.AudioContext ?? browserWindow.webkitAudioContext;
  if (!AudioContextCtor) return null;

  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    sharedAudioContext = new AudioContextCtor();
  }

  return sharedAudioContext;
};

const unlockAudioContext = async () => {
  const ctx = getAudioContext();
  if (!ctx) return null;

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return null;
    }
  }

  if (ctx.state === "running" && unlockListenersAttached) {
    window.removeEventListener("pointerdown", unlockAudioContext);
    window.removeEventListener("touchstart", unlockAudioContext);
    window.removeEventListener("keydown", unlockAudioContext);
    unlockListenersAttached = false;
  }

  return ctx.state === "running" ? ctx : null;
};

export const primeAudioNotifications = () => {
  if (typeof window === "undefined") return;

  if (!unlockListenersAttached) {
    window.addEventListener("pointerdown", unlockAudioContext, { passive: true });
    window.addEventListener("touchstart", unlockAudioContext, { passive: true });
    window.addEventListener("keydown", unlockAudioContext);
    unlockListenersAttached = true;
  }

  void unlockAudioContext();
};

export const playTone = async ({ durationMs, frequency, type = "sine", volume = 0.1 }: ToneOptions) => {
  primeAudioNotifications();

  const ctx = await unlockAudioContext();
  if (!ctx) return false;

  const durationSeconds = durationMs / 1000;
  const startAt = ctx.currentTime;
  const attack = Math.min(0.02, durationSeconds / 2);
  const safeVolume = Math.max(volume, 0.001);

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(safeVolume, startAt + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSeconds);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + durationSeconds + 0.02);

  return true;
};

export const playMessageNotificationTone = () =>
  playTone({ durationMs: 150, frequency: 800, volume: 0.1 });

export const startIncomingRingtone = () => {
  let stopped = false;

  const run = async () => {
    while (!stopped) {
      await playTone({ durationMs: 400, frequency: 440, volume: 0.15 });
      await sleep(500);
      if (stopped) break;

      await playTone({ durationMs: 400, frequency: 480, volume: 0.15 });
      await sleep(2000);
    }
  };

  void run();

  return () => {
    stopped = true;
  };
};

export const startOutgoingRingtone = () => {
  let stopped = false;

  const run = async () => {
    while (!stopped) {
      await playTone({ durationMs: 800, frequency: 440, volume: 0.08 });
      await sleep(3000);
    }
  };

  void run();

  return () => {
    stopped = true;
  };
};