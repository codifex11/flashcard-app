"use strict";

/**
 * speech.js
 * Hands-Free Voice Study Engine (Web Speech API).
 * Uses native window.speechSynthesis to read flashcard questions, answers,
 * and quiz questions aloud at natural speeds with zero external libraries.
 *
 * Designed for auditory learners, accessibility, and hands-free study.
 */

// Safety check for Web Speech API synthesis support
function isSpeechSupported() {
  return typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined";
}

// Global state container for voice synthesis
const speechState = {
  isSpeaking: false,
  currentUtterance: null,
  rate: 1.0,
  pitch: 1.0,
  autoRead: false
};


/**
 * Discovers and returns the highest quality English voice available in the browser.
 * Prioritizes natural and high-clarity synthesizer profiles.
 */
function getBestVoice() {
  if (!isSpeechSupported()) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    return null;
  }

  // Find English voices
  const enVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
  if (enVoices.length === 0) {
    return voices[0] || null;
  }

  // Prefer natural sounding voices
  const preferred = enVoices.find((v) => {
    const name = v.name.toLowerCase();
    return (
      name.includes("natural") ||
      name.includes("google") ||
      name.includes("samantha") ||
      name.includes("karen") ||
      name.includes("daniel") ||
      name.includes("serena")
    );
  });

  return preferred || enVoices.find((v) => v.lang === "en-US") || enVoices[0];
}
