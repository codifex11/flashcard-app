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
      speechState.activeText = text;
      if (typeof renderVoiceState === "function") {
        renderVoiceState();
      }
      if (typeof opts.onStart === "function") {
        opts.onStart();
      }
    };

    utterance.onboundary = (event) => {
      if (typeof opts.onBoundary === "function") {
        opts.onBoundary(event);
      }
    };

    utterance.onend = () => {
      speechState.isSpeaking = false;
      speechState.currentUtterance = null;
      speechState.activeText = "";
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


/**
 * Toggles speech reading for the current card.
 * If already speaking, it stops speech immediately. If quiet, it reads the current card aloud.
 */
function toggleReadCurrentCard() {
  if (isSpeaking()) {
    cancelSpeech();
    return false;
  }

  if (typeof state === "undefined" || !state.cards || state.cards.length === 0) {
    return false;
  }

  const currentCard = state.cards[state.currentIndex];
  if (!currentCard) {
    return false;
  }

  return speakCardFace(currentCard, Boolean(state.isFlipped));
}


/**
 * Formats a quiz question and its lettered answer choices into a natural speech string.
 */
function formatQuizQuestionSpeech(questionObj) {
  if (!questionObj || !questionObj.question) {
    return "";
  }
  const cleanQ = sanitizeSpeechText(questionObj.question);
  const letters = ["A", "B", "C", "D"];
  const optionsText = (questionObj.options || [])
    .map((opt, i) => `Option ${letters[i] || i + 1}: ${sanitizeSpeechText(opt)}.`)
    .join(" ");

  return `Question: ${cleanQ}. ${optionsText}`;
}


/**
 * Reads the active quiz question and its answer choices aloud.
 * If already speaking, stops speech immediately.
 */
function speakQuizQuestion() {
  if (isSpeaking()) {
    cancelSpeech();
    return false;
  }
  if (typeof quiz === "undefined" || !quiz.session || !quiz.session.questions) {
    return false;
  }
  const currentQ = quiz.session.questions[quiz.session.current];
  if (!currentQ) {
    return false;
  }

  const spokenText = formatQuizQuestionSpeech(currentQ);
  return speakText(spokenText);
}


/**
 * Speaks feedback and explanation aloud after answering a quiz question.
 */
function speakQuizExplanation(questionObj, chosenIndex) {
  if (!questionObj) return false;
  const isCorrect = chosenIndex === questionObj.correctIndex;
  const letters = ["A", "B", "C", "D"];
  const correctOptText = sanitizeSpeechText(questionObj.options[questionObj.correctIndex] || "");
  const explText = sanitizeSpeechText(questionObj.explanation || "");

  let speechFeedback = "";
  if (isCorrect) {
    speechFeedback = `Correct! ${explText}`;
  } else {
    speechFeedback = `Incorrect. The correct answer is Option ${letters[questionObj.correctIndex] || ""}: ${correctOptText}. ${explText}`;
  }

  return speakText(speechFeedback);
}


const SPEECH_RATES = [1.0, 1.25, 0.85];

/**
 * Returns the current speech rate multiplier.
 */
function getSpeechRate() {
  return speechState.rate;
}

/**
 * Sets and persists a new speech rate multiplier.
 */
function setSpeechRate(rate) {
  if (typeof rate !== "number" || rate < 0.5 || rate > 2.0) {
    return speechState.rate;
  }
  speechState.rate = rate;
  if (typeof saveStoredSpeechRate === "function") {
    saveStoredSpeechRate(rate);
  }
  if (typeof renderSpeechSpeed === "function") {
    renderSpeechSpeed();
  }
  return speechState.rate;
}

/**
 * Cycles through available speech rate presets (1.0x -> 1.25x -> 0.85x).
 */
function cycleSpeechRate() {
  const currentIdx = SPEECH_RATES.indexOf(speechState.rate);
  const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % SPEECH_RATES.length;
  return setSpeechRate(SPEECH_RATES[nextIdx]);
}


/**
 * Checks whether continuous auto-read mode is currently enabled.
 */
function isSpeechAutoEnabled() {
  return Boolean(speechState.autoRead);
}

/**
 * Sets and persists continuous auto-read mode.
 */
function setSpeechAuto(enabled) {
  speechState.autoRead = Boolean(enabled);
  if (typeof saveStoredSpeechAuto === "function") {
    saveStoredSpeechAuto(speechState.autoRead);
  }
  if (typeof renderVoiceState === "function") {
    renderVoiceState();
  }
  return speechState.autoRead;
}

/**
 * Toggles continuous auto-read mode on or off.
 */
function toggleSpeechAuto() {
  return setSpeechAuto(!speechState.autoRead);
}
