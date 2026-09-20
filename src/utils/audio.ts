// Synthesized sound effects using Web Audio API (no external asset dependencies needed)

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  if (!enabled) {
    stopSpeech();
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function playAudioChime() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Pleasant two-tone chime D5 -> A5 (587.33Hz -> 880Hz) to signal audio start
    [587.33, 880.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.12, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.22);
    });
  } catch (e) {
    // Ignore
  }
}

export interface SpeechOptions {
  rate?: number; // 0.70 to 1.10, default 0.80 for high clarity
  pitch?: number; // default 1.0
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: unknown) => void;
  playChime?: boolean; // default true
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

// Clean and format text to produce crisp, articulate speech with natural breathing pauses
export function formatTextForClearSpeech(text: string): string {
  if (!text) return '';
  return text
    // Remove markdown symbols that TTS might read or stumble on
    .replace(/[*_#`~]/g, '')
    .replace(/•/g, ', ')
    // Clear pause after major recipe section headers
    .replace(/(Ingredients|Steps|Method|Utensils|Tools|Equipment|Directions|Question):\s*/gi, '$1. ')
    // Clear pause after numbered steps: "1. First" -> "Step 1. First"
    .replace(/(\b\d+)\.\s+/g, 'Step $1. ')
    // Clear pause after colons & semicolons
    .replace(/;\s*/g, ', ')
    .replace(/:\s*/g, '. ')
    // Transform newlines into sentence breaks
    .replace(/\n+/g, '. ')
    // Clean up duplicate punctuation and whitespace
    .replace(/,\s*,+/g, ', ')
    .replace(/\.\s*\.+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Rate voices based on clarity, naturalness, and English accent suitability
  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    let score = 0;
    const lang = (v.lang || '').toLowerCase();
    const name = (v.name || '').toLowerCase();

    if (!lang.startsWith('en')) return -100;
    if (lang === 'en-us') score += 30;
    else if (lang === 'en-gb') score += 25;
    else score += 15;

    // High quality natural voice keywords
    if (name.includes('natural')) score += 35;
    if (name.includes('google')) score += 30;
    if (name.includes('online')) score += 20;
    if (name.includes('samantha')) score += 25;
    if (name.includes('daniel')) score += 25;
    if (name.includes('karen')) score += 20;
    if (name.includes('serena')) score += 20;
    if (name.includes('oliver')) score += 20;
    if (name.includes('premium')) score += 30;
    if (name.includes('enhanced')) score += 30;
    if (v.default) score += 5;

    return score;
  };

  const sorted = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return sorted[0] && scoreVoice(sorted[0]) > 0 ? sorted[0] : null;
}

// Pre-warm voices listener
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    // voices ready
  };
}

export function speakEnglish(text: string, options?: SpeechOptions) {
  if (!soundEnabled) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported in this browser.');
    options?.onError?.('SpeechSynthesis not supported');
    return;
  }

  stopSpeech();

  if (options?.playChime !== false) {
    playAudioChime();
  }

  // Brief delay after chime so speech starts smoothly without clipping
  const delay = options?.playChime !== false ? 260 : 0;
  setTimeout(() => {
    if (!soundEnabled) return;
    try {
      const clearText = formatTextForClearSpeech(text);
      const utterance = new SpeechSynthesisUtterance(clearText);
      utterance.lang = 'en-US';
      // Default rate calibrated to 0.80 for crystal-clear enunciation for Grade 7 SMP students
      utterance.rate = options?.rate !== undefined ? options.rate : 0.80;
      utterance.pitch = options?.pitch || 1.0;

      const voice = getEnglishVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        options?.onStart?.();
      };

      utterance.onend = () => {
        currentUtterance = null;
        options?.onEnd?.();
      };

      utterance.onerror = (event) => {
        currentUtterance = null;
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          options?.onError?.(event);
        } else {
          options?.onEnd?.();
        }
      };

      currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Error starting speech synthesis:', err);
      options?.onError?.(err);
    }
  }, delay);
}

export function stopSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      currentUtterance = null;
    } catch (e) {
      // Ignore
    }
  }
}

export function isSpeechSpeaking(): boolean {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

export function hasSpeechSynthesisSupport(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function playClickSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {
    // Ignore audio errors gracefully
  }
}

export function playCorrectSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    
    // Pleasant major two-note chord
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.12, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.25);
    });
  } catch (e) {
    // Ignore
  }
}

export function playWrongSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.18);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) {
    // Ignore
  }
}

export function playCelebrationSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.15, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.4);
    });
  } catch (e) {
    // Ignore
  }
}

/**
 * Alarming warning tone played when an exam tab-switch violation is detected.
 */
export function playViolationAlertSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Two rapid urgent descending sawtooth pulses (320Hz -> 180Hz)
    [0, 0.18].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now + offset);
      osc.frequency.linearRampToValueAtTime(160, now + offset + 0.14);
      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.15);
    });
  } catch (e) {
    // Ignore
  }
}

/**
 * Cheerful ascending chime played when the lock token is validated and access restored.
 */
export function playUnlockSuccessSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Ascending melody: G4 -> C5 -> E5 -> G5
    [392.0, 523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.28);
    });
  } catch (e) {
    // Ignore
  }
}

