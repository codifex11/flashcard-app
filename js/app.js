"use strict";

/**
 * app.js
 * Application entry point: initializes state, binds DOM events, and manages user interactions.
 */

// Handles flipping the card and updating the card display
function handleCardFlip() {
  if (state.cards.length === 0) {
    return;
  }
  flipCard();
  if (typeof playCardFlip === "function") {
    playCardFlip();
  }
  renderCard();
}

// Handles navigating to the next card
function handleNextCard() {
  if (state.cards.length < 2) {
    return;
  }
  nextCard();
  if (typeof playCardTurn === "function") {
    playCardTurn();
  }
  renderProgress();
  renderCard();
  renderButtonStates();
}

// Handles navigating to the previous card
function handlePrevCard() {
  if (state.cards.length < 2) {
    return;
  }
  prevCard();
  if (typeof playCardTurn === "function") {
    playCardTurn();
  }
  renderProgress();
  renderCard();
  renderButtonStates();
}

// Handles shuffling the active cards
function handleShuffle() {
  if (state.cards.length === 0) {
    return;
  }
  shuffleDeck();
  renderProgress();
  renderCard();
  renderButtonStates();
}

// Handles resetting card order to original deck sequence
function handleResetOrder() {
  if (state.cards.length === 0) {
    return;
  }
  resetDeckOrder();
  renderProgress();
  renderCard();
  renderButtonStates();
}

// Handles toggling review-only study mode
function handleReviewOnlyToggle(event) {
  toggleReviewOnly(event.target.checked);
  renderProgress();
  renderCard();
  renderButtonStates();
}

// Handles marking the current card as known
function handleKnownCard() {
  if (state.cards.length === 0) {
    return;
  }
  markCardKnown();
  renderAll();
}

// Handles marking the current card for review
function handleReviewCard() {
  if (state.cards.length === 0) {
    return;
  }
  markCardReview();
  renderAll();
}

// Handles switching the active deck from dropdown
function handleDeckChange(event) {
  setCurrentDeck(event.target.value);
  renderAll();
}

// Handles toggling the light and dark color theme
function handleThemeToggle() {
  toggleTheme();
  renderTheme();
}

// Handles submission of the add card form with validation
function handleAddCardSubmit(event) {
  event.preventDefault();
  clearFormErrors();

  const questionValidation = validateCardText(elements.newQuestion.value);
  const answerValidation = validateCardText(elements.newAnswer.value);
  let hasError = false;

  if (!questionValidation.valid) {
    setQuestionError(questionValidation.error);
    hasError = true;
  }

  if (!answerValidation.valid) {
    setAnswerError(answerValidation.error);
    hasError = true;
  }

  if (hasError) {
    return;
  }

  addCustomCard(questionValidation.trimmed, answerValidation.trimmed, "Custom");

  if (state.currentDeckId !== "custom") {
    setCurrentDeck("custom");
  } else {
    updateActiveCards();
  }

  closeAddCardDialog();
  renderAll();
  showStatusMessage("Saved");
}

// Handles deleting the current custom card or removing current card from weak spots
function handleDeleteCard() {
  if (state.cards.length === 0) {
    return;
  }
  if (state.currentDeckId === "weak-spots") {
    const card = state.cards[state.currentIndex];
    if (card) {
      removeWeakSpot(card.id);
      renderAll();
      showStatusMessage("Removed from weak spots");
    }
    return;
  }
  if (state.currentDeckId !== "custom") {
    return;
  }
  const isConfirmed = window.confirm("Are you sure you want to delete this card?");
  if (!isConfirmed) {
    return;
  }
  deleteCurrentCard();
  renderAll();
  showStatusMessage("Card deleted");
}

// Handles exporting cards from the custom deck or currently active study deck
function handleExportCards() {
  const customDeck = state.decks.find((deck) => deck.id === "custom");
  const targetCards = (state.currentDeckId === "custom" && customDeck && customDeck.cards.length > 0)
    ? customDeck.cards
    : (state.cards && state.cards.length > 0 ? state.cards : (customDeck ? customDeck.cards : []));

  if (!targetCards || targetCards.length === 0) {
    showStatusMessage("No cards to export");
    return;
  }

  const exportCards = targetCards.map((card) => ({
    question: card.question,
    answer: card.answer,
    category: card.category || "General"
  }));

  const activeDeckObj = state.currentDeckId === "weak-spots"
    ? { title: "Weak Spots" }
    : state.decks.find((d) => d.id === state.currentDeckId);
  const deckTitle = (activeDeckObj && (activeDeckObj.title || activeDeckObj.name)) || "My cards";

  const safeName = (deckTitle || "my-cards").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "cards";

  if (event && (event.shiftKey || event.altKey)) {
    const tsvContent = formatCardsAsTsv(exportCards);
    downloadTextFile(`${safeName}.tsv`, tsvContent, "text/tab-separated-values;charset=utf-8");
    showStatusMessage(`Exported ${exportCards.length} cards (Anki TSV)`);
  } else {
    const exportPayload = {
      name: deckTitle,
      cards: exportCards
    };
    downloadJsonFile(`${safeName}.json`, exportPayload);
    showStatusMessage(`Exported ${exportCards.length} cards (JSON)`);
  }
}

// Processes and imports cards from a File object
function processImportFile(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    try {
      const fileContent = loadEvent.target.result;
      const parsed = parseCardsFromAnyFormat(fileContent, file.name);

      if (!parsed.success || parsed.cards.length === 0) {
        showStatusMessage("Invalid file");
        return;
      }

      importCustomCards(parsed.cards);
      if (state.currentDeckId !== "custom") {
        setCurrentDeck("custom");
      } else {
        updateActiveCards();
      }
      renderAll();
      const formatSuffix = parsed.format && parsed.format !== "Unknown" ? ` (${parsed.format})` : "";
      showStatusMessage(`Imported ${parsed.cards.length} card${parsed.cards.length === 1 ? "" : "s"}${formatSuffix}`);
    } catch (parseError) {
      showStatusMessage("Invalid file");
    } finally {
      if (elements.importInput) {
        elements.importInput.value = "";
      }
    }
  };

  reader.onerror = () => {
    showStatusMessage("Invalid file");
    if (elements.importInput) {
      elements.importInput.value = "";
    }
  };

  reader.readAsText(file);
}

// Handles reading and validating an imported JSON, Anki TSV, Quizlet, or CSV file
function handleImportFile(event) {
  const file = event.target.files && event.target.files[0];
  if (file) {
    processImportFile(file);
  }
}

// Opens keyboard shortcuts cheatsheet modal
function openShortcutsDialog() {
  const dialog = document.getElementById("shortcuts-dialog");
  if (dialog && !dialog.open) {
    dialog.showModal();
  }
}
window.openShortcutsDialog = openShortcutsDialog;

// Closes keyboard shortcuts cheatsheet modal
function closeShortcutsDialog() {
  const dialog = document.getElementById("shortcuts-dialog");
  if (dialog && dialog.open) {
    dialog.close();
  }
}
window.closeShortcutsDialog = closeShortcutsDialog;

// Handles global keyboard shortcuts for card navigation, flipping, and study feedback
function handleKeyDown(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  const activeEl = document.activeElement;
  const isInputActive = activeEl && (
    activeEl.tagName === "INPUT" ||
    activeEl.tagName === "TEXTAREA" ||
    activeEl.tagName === "SELECT"
  );
  if (isInputActive) {
    return;
  }

  // File import shortcut: Ctrl+O / Cmd+O triggers file dialog
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "o") {
    event.preventDefault();
    if (elements.importInput) {
      elements.importInput.click();
    }
    return;
  }

  // File export shortcut: Ctrl+E / Cmd+E triggers deck export
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "e") {
    event.preventDefault();
    handleExportCards(event);
    return;
  }

  // Help shortcut: '?' opens shortcuts cheatsheet anywhere
  if (event.key === "?" || (event.shiftKey && event.key === "/")) {
    event.preventDefault();
    openShortcutsDialog();
    return;
  }

  const isDialogOpen = (elements.addDialog && elements.addDialog.open) ||
    document.getElementById("shortcuts-dialog")?.open;
  const isQuizMode = document.documentElement.getAttribute("data-mode") === "quiz";

  if (isDialogOpen || isQuizMode) {
    return;
  }

  const key = event.key.toLowerCase();

  if (event.key === "ArrowRight") {
    event.preventDefault();
    handleNextCard();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    handlePrevCard();
  } else if (event.key === " " || event.key === "Spacebar" || event.key === "Enter" || key === "f") {
    if (activeEl && (activeEl.tagName === "BUTTON" || activeEl.classList.contains("file-label")) && activeEl.id !== "card") {
      return;
    }
    event.preventDefault();
    handleCardFlip();
  } else if (key === "1" || key === "k") {
    event.preventDefault();
    handleKnownCard();
  } else if (key === "2" || key === "r") {
    event.preventDefault();
    handleReviewCard();
  } else if (key === "s") {
    event.preventDefault();
    handleShuffle();
  }
}

// Binds all DOM elements to their respective interaction handlers
function attachEventListeners() {
  elements.deckSelect.addEventListener("change", handleDeckChange);
  elements.themeToggle.addEventListener("click", handleThemeToggle);
  elements.card.addEventListener("click", handleCardFlip);

  // Subtle double-click to copy current card text to clipboard
  elements.card.addEventListener("dblclick", (e) => {
    e.preventDefault();
    if (state.cards.length === 0) return;
    const inner = elements.card.querySelector(".card-inner");
    const isFlipped = inner && inner.classList.contains("is-flipped");
    const text = isFlipped ? elements.cardAnswer.textContent : elements.cardQuestion.textContent;
    if (text && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showStatusMessage(isFlipped ? "Answer copied" : "Question copied");
      }).catch(() => {});
    }
  });

  // Touch swipe gestures for natural mobile and tablet navigation
  let touchStartX = 0;
  let touchStartY = 0;
  elements.card.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  elements.card.addEventListener("touchend", (e) => {
    if (e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX < 0) {
          handleNextCard();
        } else {
          handlePrevCard();
        }
      }
    }
  }, { passive: true });
  elements.flipBtn.addEventListener("click", handleCardFlip);
  elements.prevBtn.addEventListener("click", handlePrevCard);
  elements.nextBtn.addEventListener("click", handleNextCard);
  elements.shuffleBtn.addEventListener("click", handleShuffle);
  elements.resetOrderBtn.addEventListener("click", handleResetOrder);
  elements.reviewOnlyToggle.addEventListener("change", handleReviewOnlyToggle);
  elements.knownBtn.addEventListener("click", handleKnownCard);
  elements.reviewBtn.addEventListener("click", handleReviewCard);
  elements.addCardBtn.addEventListener("click", openAddCardDialog);
  elements.cancelCardBtn.addEventListener("click", closeAddCardDialog);
  elements.addCardForm.addEventListener("submit", handleAddCardSubmit);
  elements.deleteCardBtn.addEventListener("click", handleDeleteCard);
  elements.exportBtn.addEventListener("click", handleExportCards);
  elements.importInput.addEventListener("change", handleImportFile);

  if (elements.cardArea) {
    elements.cardArea.addEventListener("dragover", (event) => {
      event.preventDefault();
      elements.cardArea.classList.add("is-dragover");
    });
    elements.cardArea.addEventListener("dragleave", () => {
      elements.cardArea.classList.remove("is-dragover");
    });
    elements.cardArea.addEventListener("drop", (event) => {
      event.preventDefault();
      elements.cardArea.classList.remove("is-dragover");
      const droppedFile = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (droppedFile) {
        processImportFile(droppedFile);
      }
    });
  }

  const fileLabel = document.querySelector(".file-label");
  if (fileLabel) {
    fileLabel.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        elements.importInput.click();
      }
    });
  }

  elements.addDialog.addEventListener("close", () => {
    elements.addCardForm.reset();
    clearFormErrors();
  });

  elements.addDialog.addEventListener("click", (e) => {
    if (e.target === elements.addDialog) {
      closeAddCardDialog();
    }
  });

  const closeShortcutsBtn = document.getElementById("close-shortcuts-btn");
  if (closeShortcutsBtn) {
    closeShortcutsBtn.addEventListener("click", closeShortcutsDialog);
  }
  const shortcutsDialog = document.getElementById("shortcuts-dialog");
  if (shortcutsDialog) {
    shortcutsDialog.addEventListener("click", (e) => {
      if (e.target === shortcutsDialog) {
        closeShortcutsDialog();
      }
    });
  }

  window.addEventListener("keydown", handleKeyDown);

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!loadStoredTheme()) {
        state.theme = e.matches ? "dark" : "light";
        renderTheme();
      }
    });
  }
}

// Initializes application state, renders UI, and sets up event listeners
function initApp() {
  initState();
  renderAll();
  attachEventListeners();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
