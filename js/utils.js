"use strict";

/**
 * utils.js
 * Utility helper functions for array shuffling, input validation, unique ID generation, and file downloading.
 */

// Global counter to ensure unique custom card IDs even if generated within the same millisecond
let customCardIdCounter = 0;

// Returns a new array with elements shuffled using the Fisher-Yates algorithm
function shuffleArray(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Unescapes HTML entities commonly found in exported Anki/Quizlet decks
function unescapeHtmlEntities(str) {
  if (typeof str !== "string") {
    return "";
  }
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Strips HTML tags commonly exported from Anki while preserving line breaks
function stripHtmlPreservingBreaks(html) {
  if (typeof html !== "string") {
    return "";
  }
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div)>/gi, "\n")
    .replace(/<(p|div)[^>]*>/gi, "")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/{{c\d+::(.*?)(?:::.*?)?}}/gi, "$1")
    .replace(/<[^>]+>/g, "");

  text = unescapeHtmlEntities(text);
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Validates question or answer text, checking trimmed presence and maximum length
function validateCardText(text) {
  if (typeof text !== "string") {
    return { valid: false, trimmed: "", error: "Value must be text." };
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, trimmed: "", error: "Field cannot be empty or whitespace only." };
  }
  if (trimmed.length > 300) {
    return { valid: false, trimmed, error: "Text must be 300 characters or fewer." };
  }
  return { valid: true, trimmed, error: "" };
}

// Generates a unique identifier for user-created custom cards
function generateCustomId() {
  customCardIdCounter += 1;
  return `custom-${Date.now()}-${customCardIdCounter}`;
}

// Initiates a browser download of an object formatted as a JSON file
function downloadJsonFile(filename, data) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);
  const linkElement = document.createElement("a");
  linkElement.href = downloadUrl;
  linkElement.download = filename;
  document.body.appendChild(linkElement);
  linkElement.click();
  document.body.removeChild(linkElement);
  URL.revokeObjectURL(downloadUrl);
}

// Wraps an index within a range from 0 to total minus 1 with defensive numeric sanitization
function wrapIndex(index, total) {
  const safeTotal = Math.floor(Number(total)) || 0;
  if (safeTotal <= 0) {
    return 0;
  }
  const safeIndex = Math.floor(Number(index)) || 0;
  return ((safeIndex % safeTotal) + safeTotal) % safeTotal;
}
