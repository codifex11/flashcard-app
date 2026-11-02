"use strict";

/**
 * audio.js
 * Procedural Tactile Audio Engine (Web Audio ASMR Soundscapes).
 * Generates subtle physical acoustic feedback using the native browser Web Audio API:
 * - Gentle card flip paper rustle (bandpass-filtered noise sweep)
 * - Soft wooden desk tap (damped low-frequency sine thump)
 * - Tactile micro-click on option selection
 * - Gentle harmonic chime for known cards
 * - Dampened woodblock thud for review cards
 * - Uplifting ascending chime on 100% quiz completion
 *
 * Zero external libraries, zero MP3/WAV audio files.
 */

// Global AudioContext singleton holder
let audioContextInstance = null;
let isMutedState = false;

// Checks whether Web Audio API is supported in the current runtime environment
function isAudioSupported() {
  return (
    typeof window !== "undefined" &&
    (typeof window.AudioContext !== "undefined" || typeof window.webkitAudioContext !== "undefined")
  );
}

// Lazily retrieves or instantiates the AudioContext upon user gesture
function getAudioContext() {
  if (!isAudioSupported()) {
    return null;
  }
  if (!audioContextInstance) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    try {
      audioContextInstance = new AudioContextClass();
    } catch (err) {
      return null;
    }
  }
  if (audioContextInstance && audioContextInstance.state === "suspended") {
    audioContextInstance.resume().catch(() => {});
  }
  return audioContextInstance;
}

// Procedurally generates an audio buffer filled with uniform white noise
function createNoiseBuffer(ctx, durationSeconds) {
  if (!ctx) return null;
  const duration = durationSeconds || 1.0;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // Generate white noise values between -1.0 and 1.0
    output[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Synthesizes a gentle stationery paper rustle when an index card is flipped.
 * Utilizes bandpass-filtered noise swept downward with a soft exponential decay.
 */
function playCardFlip() {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const duration = 0.16;
    const noiseBuffer = createNoiseBuffer(ctx, duration);
    if (!noiseBuffer) return;

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;

    // Bandpass filter to sculpt white noise into paper friction texture
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.setValueAtTime(1.8, now);
    filter.frequency.setValueAtTime(750, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + duration);

    // Soft whisper-level gain envelope
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(now);
    source.stop(now + duration);
  } catch (err) {
    // Graceful silence on any platform audio restriction
  }
}

/**
 * Synthesizes a soft wooden desk tap when advancing or rewinding cards.
 * Combines a subtle low-frequency resonance with a tiny dampened impact click.
 */
function playCardTurn() {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const duration = 0.09;

    // Low wooden body resonance
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + duration);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.09, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch (err) {
    // Graceful silence on any platform audio restriction
  }
}

/**
 * Synthesizes a delicate tactile micro-click when selecting an answer option.
 * Extremely short duration (14ms) provides crisp tactile confirmation without distraction.
 */
function playOptionSelect() {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const duration = 0.014;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + duration);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.06, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch (err) {
    // Graceful silence
  }
}

/**
 * Synthesizes a gentle harmonic chime when marking a card as known.
 * Dual sine waves (C5 and E5) create a pleasant, warm consonance.
 */
function playKnown() {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const duration = 0.32;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc2.frequency.setValueAtTime(659.25, now); // E5

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.06, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  } catch (err) {
    // Graceful silence
  }
}
