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
  theme: "flashcards.theme"
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

// Loads custom cards from localStorage, validating that the result is an array
function loadStoredCustomCards() {
  const data = loadFromStorage(STORAGE_KEYS.customCards, []);
  return Array.isArray(data) ? data : [];
}

// Saves custom cards array to localStorage
function saveStoredCustomCards(cards) {
  saveToStorage(STORAGE_KEYS.customCards, cards);
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
