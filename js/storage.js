"use strict";

/**
 * storage.js
 * Handles saving and loading application state to and from browser localStorage with safe error handling.
 */

// Storage key names defined by the application specification
const STORAGE_KEYS = {
  customCards: "flashcards.customCards",
  known: "flashcards.known",
  review: "flashcards.review",
  lastDeck: "flashcards.lastDeck",
  theme: "flashcards.theme",
  weakSpots: "flashcards.weakSpots",
  audioMuted: "flashcards.audio_muted",
  speechRate: "flashcards.speech_rate",
  speechAuto: "flashcards.speech_auto_enabled"
};

// Checks if localStorage is supported and accessible in the current browser environment
function isStorageAvailable() {
  try {
    const testKey = "__fc_storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (err) {
    return false;
  }
}

// Safely retrieves and parses a value from localStorage, returning defaultValue on any failure
function loadFromStorage(key, defaultValue) {
  if (!isStorageAvailable()) {
    return defaultValue;
  }
  try {
    const rawValue = window.localStorage.getItem(key);
    if (rawValue === null) {
      return defaultValue;
    }
    return JSON.parse(rawValue);
  } catch (err) {
    return defaultValue;
  }
}

// Safely serializes and saves a value to localStorage
function saveToStorage(key, value) {
  if (!isStorageAvailable()) {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Silently fall back if storage quota is exceeded or storage is disabled
  }
}

// Loads custom cards from localStorage, validating that the result is an array of valid card objects
function loadStoredCustomCards() {
  const data = loadFromStorage(STORAGE_KEYS.customCards, []);
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter((card) => card && typeof card.question === "string" && typeof card.answer === "string");
}

// Saves custom cards array to localStorage
function saveStoredCustomCards(cards) {
  saveToStorage(STORAGE_KEYS.customCards, cards);
}

// Loads weak spot cards from localStorage, validating schema integrity
function loadStoredWeakSpots() {
  const data = loadFromStorage(STORAGE_KEYS.weakSpots, []);
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter((card) => card && typeof card.question === "string" && typeof card.answer === "string");
}

// Saves weak spot cards array to localStorage
function saveStoredWeakSpots(cards) {
  saveToStorage(STORAGE_KEYS.weakSpots, Array.isArray(cards) ? cards : []);
}

// Clears all stored weak spots from localStorage
function clearStoredWeakSpots() {
  saveToStorage(STORAGE_KEYS.weakSpots, []);
}

// Loads known card ids per deck from localStorage, validating that the result is an object
function loadStoredKnown() {
  const data = loadFromStorage(STORAGE_KEYS.known, {});
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

// Saves known card ids object to localStorage
function saveStoredKnown(knownObj) {
  saveToStorage(STORAGE_KEYS.known, knownObj);
}

// Loads review card ids per deck from localStorage, validating that the result is an object
function loadStoredReview() {
  const data = loadFromStorage(STORAGE_KEYS.review, {});
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

// Saves review card ids object to localStorage
function saveStoredReview(reviewObj) {
  saveToStorage(STORAGE_KEYS.review, reviewObj);
}

// Loads the last selected deck ID from localStorage
function loadStoredLastDeck() {
  const deckId = loadFromStorage(STORAGE_KEYS.lastDeck, "web-dev");
  return typeof deckId === "string" ? deckId : "web-dev";
}

// Saves the last selected deck ID to localStorage
function saveStoredLastDeck(deckId) {
  saveToStorage(STORAGE_KEYS.lastDeck, deckId);
}

// Loads the user-selected theme preference from localStorage
function loadStoredTheme() {
  const theme = loadFromStorage(STORAGE_KEYS.theme, null);
  if (theme === "dark" || theme === "light") {
    return theme;
  }
  return null;
}

// Saves the user theme preference to localStorage
function saveStoredTheme(theme) {
  saveToStorage(STORAGE_KEYS.theme, theme);
}

// Loads the audio mute preference from localStorage
function loadStoredAudioMuted() {
  const muted = loadFromStorage(STORAGE_KEYS.audioMuted, false);
  return typeof muted === "boolean" ? muted : false;
}

// Saves the audio mute preference to localStorage
function saveStoredAudioMuted(isMuted) {
  saveToStorage(STORAGE_KEYS.audioMuted, Boolean(isMuted));
}

// Loads the user-selected speech rate multiplier (defaults to 1.0)
function loadStoredSpeechRate() {
  const rate = loadFromStorage(STORAGE_KEYS.speechRate, 1.0);
  return typeof rate === "number" && rate >= 0.5 && rate <= 2.0 ? rate : 1.0;
}

// Saves the speech rate multiplier to localStorage
function saveStoredSpeechRate(rate) {
  if (typeof rate === "number") {
    saveToStorage(STORAGE_KEYS.speechRate, rate);
  }
}

// Loads the auto-read aloud preference from localStorage (defaults to false)
function loadStoredSpeechAuto() {
  const auto = loadFromStorage(STORAGE_KEYS.speechAuto, false);
  return typeof auto === "boolean" ? auto : false;
}

// Saves the auto-read aloud preference to localStorage
function saveStoredSpeechAuto(auto) {
  saveToStorage(STORAGE_KEYS.speechAuto, Boolean(auto));
}
