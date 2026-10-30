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

// Parses a single delimited line supporting RFC-4180 quotes and escaped double quotes
function parseDelimitedLine(line, delimiter = ",") {
  if (typeof line !== "string") {
    return [];
  }
  const fields = [];
  let currentField = "";
  let insideQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes) {
        if (i + 1 < line.length && line[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          insideQuotes = false;
          i += 1;
          continue;
        }
      } else {
        if (currentField.length === 0) {
          insideQuotes = true;
          i += 1;
          continue;
        } else {
          currentField += '"';
          i += 1;
          continue;
        }
      }
    }

    if (char === delimiter && !insideQuotes) {
      fields.push(currentField);
      currentField = "";
      i += 1;
      continue;
    }

    currentField += char;
    i += 1;
  }

  fields.push(currentField);
  return fields;
}

// Detects whether text is separated by tab, comma, semicolon, or pipe
function detectDelimiter(text) {
  if (typeof text !== "string") {
    return ",";
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 5);
  if (lines.length === 0) {
    return ",";
  }

  const counts = { "\t": 0, ",": 0, ";": 0, "|": 0 };
  for (const line of lines) {
    for (const d of ["\t", ",", ";", "|"]) {
      let inQuote = false;
      let count = 0;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') inQuote = !inQuote;
        else if (line[i] === d && !inQuote) count++;
      }
      counts[d] += count;
    }
  }

  if (counts["\t"] > 0 && counts["\t"] >= lines.length - 1) {
    return "\t";
  }

  let bestDelim = ",";
  let maxCount = -1;
  for (const [d, count] of Object.entries(counts)) {
    if (count > maxCount && count > 0) {
      maxCount = count;
      bestDelim = d;
    }
  }

  return bestDelim;
}

// Detects whether the first row of a delimited file is a column header rather than a flashcard
function isHeaderRow(fields) {
  if (!Array.isArray(fields) || fields.length < 2) {
    return false;
  }
  const f0 = String(fields[0] || "").trim().toLowerCase();
  const f1 = String(fields[1] || "").trim().toLowerCase();

  const questionHeaders = ["front", "question", "prompt", "term", "q", "card front", "#"];
  const answerHeaders = ["back", "answer", "definition", "def", "a", "card back", "meaning"];

  return questionHeaders.includes(f0) && answerHeaders.includes(f1);
}

// Parses delimited text (Anki TSV, Quizlet TSV/CSV, or standard spreadsheets) into cards
function parseDelimitedCards(text, forcedDelimiter = null) {
  if (typeof text !== "string") {
    return [];
  }
  const delimiter = forcedDelimiter || detectDelimiter(text);

  const rawLines = text.split(/\r?\n/);
  const records = [];
  let buffer = "";
  let insideQuotes = false;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx];
    if (buffer.length > 0) {
      buffer += "\n" + line;
    } else {
      buffer = line;
    }

    let quoteCount = 0;
    for (let c = 0; c < line.length; c++) {
      if (line[c] === '"') quoteCount++;
    }
    if (quoteCount % 2 !== 0) {
      insideQuotes = !insideQuotes;
    }

    if (!insideQuotes) {
      if (buffer.trim().length > 0) {
        records.push(buffer);
      }
      buffer = "";
    }
  }

  if (buffer.trim().length > 0) {
    records.push(buffer);
  }

  const validCards = [];
  let isFirstRow = true;

  for (const record of records) {
    const fields = parseDelimitedLine(record, delimiter);
    if (!fields || fields.length < 2) {
      continue;
    }

    if (isFirstRow) {
      isFirstRow = false;
      if (isHeaderRow(fields)) {
        continue;
      }
    }

    const rawQuestion = stripHtmlPreservingBreaks(fields[0] || "");
    const rawAnswer = stripHtmlPreservingBreaks(fields[1] || "");
    const rawCategory = stripHtmlPreservingBreaks(fields[2] || "");

    const qVal = validateCardText(rawQuestion);
    const aVal = validateCardText(rawAnswer);

    if (qVal.valid && aVal.valid) {
      validCards.push({
        question: qVal.trimmed,
        answer: aVal.trimmed,
        category: rawCategory || "Custom"
      });
    }
  }

  return validCards;
}

// Automatically detects and parses cards from JSON, Anki/Quizlet TSV, CSV, or plain text
function parseCardsFromAnyFormat(fileContent, filename = "") {
  if (typeof fileContent !== "string" || fileContent.trim().length === 0) {
    return { success: false, cards: [], format: "Unknown", error: "File is empty." };
  }

  const ext = (filename.split(".").pop() || "").toLowerCase();
  const trimmed = fileContent.trim();

  // 1. If explicit JSON extension or JSON-like syntax
  if (ext === "json" || (trimmed.startsWith("{") || trimmed.startsWith("["))) {
    try {
      const parsed = JSON.parse(trimmed);
      let rawList = null;

      if (Array.isArray(parsed)) {
        rawList = parsed;
      } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.cards)) {
        rawList = parsed.cards;
      }

      if (Array.isArray(rawList)) {
        const validCards = [];
        for (const item of rawList) {
          if (!item || typeof item !== "object") continue;
          const qVal = validateCardText(typeof item.question === "string" ? item.question : "");
          const aVal = validateCardText(typeof item.answer === "string" ? item.answer : "");
          if (qVal.valid && aVal.valid) {
            validCards.push({
              question: qVal.trimmed,
              answer: aVal.trimmed,
              category: typeof item.category === "string" && item.category.trim() ? item.category.trim() : "Custom"
            });
          }
        }
        if (validCards.length > 0) {
          return { success: true, cards: validCards, format: "JSON", error: "" };
        }
      }
    } catch (jsonErr) {
      // Fall through to delimited parser
    }
  }

  // 2. Delimited parser (Anki TSV, Quizlet, CSV, TXT)
  const delimiter = detectDelimiter(trimmed);
  const cards = parseDelimitedCards(trimmed, delimiter);

  if (cards.length > 0) {
    let formatLabel = "CSV";
    if (delimiter === "\t") {
      formatLabel = "TSV (Anki/Quizlet)";
    } else if (delimiter === ";") {
      formatLabel = "Semicolon-delimited";
    } else if (delimiter === "|") {
      formatLabel = "Pipe-delimited";
    }
    return { success: true, cards, format: formatLabel, error: "" };
  }

  return { success: false, cards: [], format: "Unrecognized", error: "No valid flashcards found in file." };
}

// Formats an array of cards into tab-separated values (TSV) for native Anki import
function formatCardsAsTsv(cards) {
  if (!Array.isArray(cards)) {
    return "";
  }
  const lines = [];
  for (const card of cards) {
    if (!card) continue;
    const q = String(card.question || "").replace(/\t/g, " ").replace(/\r?\n/g, "<br>");
    const a = String(card.answer || "").replace(/\t/g, " ").replace(/\r?\n/g, "<br>");
    const cat = String(card.category || "Custom").replace(/\t/g, " ").replace(/\r?\n/g, " ");
    lines.push(`${q}\t${a}\t${cat}`);
  }
  return lines.join("\n");
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
