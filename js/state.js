"use strict";

/**
 * state.js
 * Central application state and state mutation functions.
 */

// Application state holding decks, current active cards, indices, and study statistics
const state = {
  decks: [],          // built-in decks + custom deck
  currentDeckId: "web-dev",
  cards: [],          // cards currently being studied (after shuffle / review filter)
  currentIndex: 0,
  isFlipped: false,
  known: {},          // { deckId: [cardId, ...] }
  review: {},         // { deckId: [cardId, ...] }
  reviewOnly: false,
  theme: "dark"
};

// Extracts academic flashcard decks from the data bundle organized by department, year, semester, subject, and phase
function buildAcademicDecks() {
  const bundle = window.APP_DATA_BUNDLE;
  if (!bundle || !bundle.index || !bundle.subjects) {
    return [];
  }
  const academicDecks = [];
  const depts = bundle.index.departments || [];
  for (const dept of depts) {
    for (const year of dept.years || []) {
      for (const sem of year.semesters || []) {
        for (const subj of sem.subjects || []) {
          const subjData = bundle.subjects[subj.id];
          if (!subjData || !subjData.flashcards || !Array.isArray(subjData.flashcards.phases)) {
            continue;
          }
          const groupLabel = `${dept.name} · ${year.year} · ${sem.semester}`;
          const allCards = [];
          for (const phase of subjData.flashcards.phases) {
            const phaseCards = (phase.cards || []).map((c) => ({
              id: c.id,
              question: c.question,
              answer: c.answer,
              category: c.category || subj.name,
              sourceRef: c.sourceRef || "",
              confidence: c.confidence || "high"
            }));
            allCards.push(...phaseCards);
            academicDecks.push({
              id: `${subj.id}-p${phase.phaseNumber}`,
              subjectId: subj.id,
              subjectName: subj.name,
              phaseNumber: phase.phaseNumber,
              phaseTitle: phase.title,
              name: `${subj.name} — Phase ${phase.phaseNumber}: ${phase.title} (${phaseCards.length})`,
              shortName: `Phase ${phase.phaseNumber}: ${phase.title}`,
              group: groupLabel,
              deptName: dept.name,
              yearName: year.year,
              semName: sem.semester,
              cards: phaseCards
            });
          }
          academicDecks.push({
            id: `${subj.id}-all`,
            subjectId: subj.id,
            subjectName: subj.name,
            phaseNumber: "all",
            phaseTitle: "All Phases",
            name: `${subj.name} — All 5 Phases (${allCards.length} cards)`,
            shortName: `All Phases (${allCards.length})`,
            group: groupLabel,
            deptName: dept.name,
            yearName: year.year,
            semName: sem.semester,
            cards: allCards
          });
        }
      }
    }
  }
  return academicDecks;
}

// Retrieves academic metadata for the current active deck
function getCurrentAcademicInfo() {
  const currentDeck = getCurrentDeck();
  if (!currentDeck || !currentDeck.subjectId) {
    return null;
  }
  const allSubjectDecks = state.decks.filter((d) => d.subjectId === currentDeck.subjectId);
  return {
    subjectId: currentDeck.subjectId,
    subjectName: currentDeck.subjectName,
    deptName: currentDeck.deptName,
    yearName: currentDeck.yearName,
    semName: currentDeck.semName,
    currentPhase: currentDeck.phaseNumber,
    currentPhaseTitle: currentDeck.phaseTitle,
    decks: allSubjectDecks
  };
}

// Switches study phase for the currently active academic subject
function switchPhase(phaseNumber) {
  const currentDeck = getCurrentDeck();
  if (!currentDeck || !currentDeck.subjectId) {
    return;
  }
  const targetId = phaseNumber === "all" ? `${currentDeck.subjectId}-all` : `${currentDeck.subjectId}-p${phaseNumber}`;
  const targetDeck = state.decks.find((d) => d.id === targetId);
  if (targetDeck) {
    setCurrentDeck(targetDeck.id);
  }
}

// Initializes application state from built-in data, academic bundle, and saved storage records
function initState() {
  const customCards = loadStoredCustomCards();
  const academicDecks = buildAcademicDecks();
  state.decks = [
    ...academicDecks,
    {
      id: "custom",
      name: "My cards",
      group: "Custom Collection",
      cards: customCards
    },
    ...BUILT_IN_DECKS.map((deck) => ({
      id: deck.id,
      name: deck.name,
      group: "General Knowledge",
      cards: [...deck.cards]
    }))
  ];

  state.known = loadStoredKnown();
  state.review = loadStoredReview();

  const savedDeckId = loadStoredLastDeck();
  const deckExists = state.decks.some((deck) => deck.id === savedDeckId);
  const defaultDeckId = academicDecks.length > 0 ? academicDecks[0].id : "web-dev";
  state.currentDeckId = deckExists ? savedDeckId : defaultDeckId;

  const themeInit = loadFromStorage("flashcards.theme_initialized", null);
  if (!themeInit) {
    saveToStorage("flashcards.theme_initialized", "true");
    state.theme = "dark";
    saveStoredTheme("dark");
  } else {
    const savedTheme = loadStoredTheme();
    state.theme = (savedTheme === "light" || savedTheme === "dark") ? savedTheme : "dark";
  }

  state.reviewOnly = false;
  state.isFlipped = false;
  state.currentIndex = 0;
  updateActiveCards();
}

// Retrieves the deck object matching the current deck ID
function getCurrentDeck() {
  return state.decks.find((deck) => deck.id === state.currentDeckId) || state.decks[0];
}

// Updates the active study card array based on deck selection and review-only filtering
function updateActiveCards() {
  const currentDeck = getCurrentDeck();
  if (!currentDeck) {
    state.cards = [];
    state.currentIndex = 0;
    return;
  }

  if (state.reviewOnly) {
    const reviewIds = state.review[state.currentDeckId] || [];
    state.cards = currentDeck.cards.filter((card) => reviewIds.includes(card.id));
  } else {
    state.cards = [...currentDeck.cards];
  }

  if (state.cards.length === 0) {
    state.currentIndex = 0;
  } else if (state.currentIndex >= state.cards.length) {
    state.currentIndex = 0;
  }
}

// Changes the active deck, resets navigation state, and disables review-only mode
function setCurrentDeck(deckId) {
  state.currentDeckId = deckId;
  state.reviewOnly = false;
  state.currentIndex = 0;
  state.isFlipped = false;
  updateActiveCards();
  saveStoredLastDeck(deckId);
}

// Advances to the next card in the active card pool, wrapping to the start
function nextCard() {
  if (state.cards.length === 0) {
    return;
  }
  state.currentIndex = wrapIndex(state.currentIndex + 1, state.cards.length);
  state.isFlipped = false;
}

// Navigates to the previous card in the active card pool, wrapping to the end
function prevCard() {
  if (state.cards.length === 0) {
    return;
  }
  state.currentIndex = wrapIndex(state.currentIndex - 1, state.cards.length);
  state.isFlipped = false;
}

// Toggles the flip state between question and answer
function flipCard() {
  if (state.cards.length === 0) {
    return;
  }
  state.isFlipped = !state.isFlipped;
}

// Shuffles the currently active cards using Fisher-Yates and resets the index
function shuffleDeck() {
  if (state.cards.length === 0) {
    return;
  }
  state.cards = shuffleArray(state.cards);
  state.currentIndex = 0;
  state.isFlipped = false;
}

// Restores cards to their original deck order
function resetDeckOrder() {
  updateActiveCards();
  state.currentIndex = 0;
  state.isFlipped = false;
}

// Marks the current card as known, moves it out of review, and advances to the next card
function markCardKnown() {
  if (state.cards.length === 0) {
    return;
  }
  const currentCard = state.cards[state.currentIndex];
  const deckId = state.currentDeckId;

  if (!state.known[deckId]) {
    state.known[deckId] = [];
  }
  if (!state.review[deckId]) {
    state.review[deckId] = [];
  }

  state.review[deckId] = state.review[deckId].filter((id) => id !== currentCard.id);
  if (!state.known[deckId].includes(currentCard.id)) {
    state.known[deckId].push(currentCard.id);
  }

  saveStoredKnown(state.known);
  saveStoredReview(state.review);

  if (state.reviewOnly) {
    updateActiveCards();
  } else {
    state.currentIndex = wrapIndex(state.currentIndex + 1, state.cards.length);
  }
  state.isFlipped = false;
}

// Marks the current card for review, moves it out of known, and advances to the next card
function markCardReview() {
  if (state.cards.length === 0) {
    return;
  }
  const currentCard = state.cards[state.currentIndex];
  const deckId = state.currentDeckId;

  if (!state.known[deckId]) {
    state.known[deckId] = [];
  }
  if (!state.review[deckId]) {
    state.review[deckId] = [];
  }

  state.known[deckId] = state.known[deckId].filter((id) => id !== currentCard.id);
  if (!state.review[deckId].includes(currentCard.id)) {
    state.review[deckId].push(currentCard.id);
  }

  saveStoredKnown(state.known);
  saveStoredReview(state.review);

  state.currentIndex = wrapIndex(state.currentIndex + 1, state.cards.length);
  state.isFlipped = false;
}

// Toggles review-only study mode for the current deck
function toggleReviewOnly(enabled) {
  state.reviewOnly = Boolean(enabled);
  state.currentIndex = 0;
  state.isFlipped = false;
  updateActiveCards();
}

// Adds a new custom card to the My cards deck and saves it to storage
function addCustomCard(question, answer, category) {
  const newCard = {
    id: generateCustomId(),
    question,
    answer,
    category: category || "Custom"
  };

  const customDeck = state.decks.find((deck) => deck.id === "custom");
  if (customDeck) {
    customDeck.cards.push(newCard);
    saveStoredCustomCards(customDeck.cards);
  }

  if (state.currentDeckId === "custom") {
    updateActiveCards();
  }
  return newCard;
}

// Deletes the currently displayed card from the My cards deck
function deleteCurrentCard() {
  if (state.currentDeckId !== "custom" || state.cards.length === 0) {
    return false;
  }

  const currentCard = state.cards[state.currentIndex];
  const customDeck = state.decks.find((deck) => deck.id === "custom");
  if (!customDeck) {
    return false;
  }

  customDeck.cards = customDeck.cards.filter((card) => card.id !== currentCard.id);
  saveStoredCustomCards(customDeck.cards);

  if (state.known.custom) {
    state.known.custom = state.known.custom.filter((id) => id !== currentCard.id);
    saveStoredKnown(state.known);
  }
  if (state.review.custom) {
    state.review.custom = state.review.custom.filter((id) => id !== currentCard.id);
    saveStoredReview(state.review);
  }

  updateActiveCards();
  state.isFlipped = false;
  return true;
}

// Adds imported valid cards into the My cards deck and saves them to storage
function importCustomCards(validCards) {
  const customDeck = state.decks.find((deck) => deck.id === "custom");
  if (!customDeck) {
    return;
  }

  for (const card of validCards) {
    customDeck.cards.push({
      id: generateCustomId(),
      question: card.question,
      answer: card.answer,
      category: card.category || "Custom"
    });
  }

  saveStoredCustomCards(customDeck.cards);
  if (state.currentDeckId === "custom") {
    updateActiveCards();
  }
}

// Toggles the theme between light and dark mode and saves preference
function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  saveStoredTheme(state.theme);
  return state.theme;
}
