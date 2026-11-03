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


/**
 * Immediately cancels any active or pending speech synthesis utterance.
 * Safely resets speaking flags across browser implementations.
 */
function cancelSpeech() {
  if (!isSpeechSupported()) {
    speechState.isSpeaking = false;
    speechState.currentUtterance = null;
    return;
  }
  try {
    window.speechSynthesis.cancel();
  } catch (err) {
    // Graceful fallback
  }
  speechState.isSpeaking = false;
  speechState.currentUtterance = null;
  if (typeof renderVoiceState === "function") {
    renderVoiceState();
  }
}


/**
 * Synthesizes and speaks text aloud using the browser SpeechSynthesis engine.
 * Supports callbacks and rate/pitch parameters.
 */
function speakText(text, options) {
  if (!isSpeechSupported() || !text || typeof text !== "string") {
    return false;
  }

  const opts = options || {};
  cancelSpeech();

  try {
    const utterance = new window.SpeechSynthesisUtterance(text);
    const voice = getBestVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "en-US";
    }

    utterance.rate = typeof opts.rate === "number" ? opts.rate : speechState.rate;
    utterance.pitch = typeof opts.pitch === "number" ? opts.pitch : speechState.pitch;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      speechState.isSpeaking = true;
      speechState.currentUtterance = utterance;
      if (typeof renderVoiceState === "function") {
        renderVoiceState();
      }
      if (typeof opts.onStart === "function") {
        opts.onStart();
      }
    };

    utterance.onend = () => {
      speechState.isSpeaking = false;
      speechState.currentUtterance = null;
      if (typeof renderVoiceState === "function") {
        renderVoiceState();
      }
      if (typeof opts.onEnd === "function") {
        opts.onEnd();
      }
    };

    utterance.onerror = (event) => {
      speechState.isSpeaking = false;
      speechState.currentUtterance = null;
      if (typeof renderVoiceState === "function") {
        renderVoiceState();
      }
      if (typeof opts.onError === "function") {
        opts.onError(event);
      }
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    speechState.isSpeaking = false;
    speechState.currentUtterance = null;
    return false;
  }
}


/**
 * Strips markdown formatting, code ticks, and special symbols from text
 * so that the speech engine pronounces clean, natural sentences without reading punctuation.
 */
function sanitizeSpeechText(text) {
  if (!text || typeof text !== "string") {
    return "";
  }
  return text
    // Replace markdown bold/italic asterisks and underscores
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Replace inline code backticks
    .replace(/`([^`]+)`/g, "$1")
    // Replace HTML tags
    .replace(/<[^>]+>/g, " ")
    // Convert multiple dashes or bullet characters to clean pause commas
    .replace(/^[\s*•\-–—]+\s*/gm, "")
    // Normalize consecutive whitespace and newlines
    .replace(/\s+/g, " ")
    .trim();
}


// Initialize speech rate and auto-read state from persistent storage
if (typeof loadStoredSpeechRate === "function") {
  speechState.rate = loadStoredSpeechRate();
}
if (typeof loadStoredSpeechAuto === "function") {
  speechState.autoRead = loadStoredSpeechAuto();
}

/**
 * Returns true if speech synthesis is currently active or speaking.
 */
function isSpeaking() {
  if (!isSpeechSupported()) {
    return false;
  }
  return speechState.isSpeaking || window.speechSynthesis.speaking;
}


/**
 * Speaks the active face of a flashcard (question if front, answer if back).
 */
function speakCardFace(card, isFlipped) {
  if (!card) return false;
  const rawText = isFlipped ? card.answer : card.question;
  const clean = sanitizeSpeechText(rawText);
  if (!clean) return false;

  const prefix = isFlipped ? "Answer: " : "Question: ";
  return speakText(`${prefix}${clean}`);
}


/**
 * Sequentially reads the question, pauses briefly, and then reads the answer aloud.
 * Ideal for hands-free audio revision while walking or commuting.
 */
function speakEntireCard(card, onComplete) {
  if (!card) return false;
  const qClean = sanitizeSpeechText(card.question);
  const aClean = sanitizeSpeechText(card.answer);
  if (!qClean) return false;

  return speakText(`Question: ${qClean}`, {
    onEnd: () => {
      // Gentle 900ms pause before revealing the answer
      setTimeout(() => {
        if (!isSpeechSupported()) return;
        speakText(`Answer: ${aClean}`, {
          onEnd: () => {
            if (typeof onComplete === "function") {
              onComplete();
            }
          }
        });
      }, 900);
    }
  });
}
