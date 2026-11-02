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
