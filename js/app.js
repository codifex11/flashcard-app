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
  renderCard();
}

// Handles navigating to the next card
function handleNextCard() {
  if (state.cards.length < 2) {
    return;
  }
  nextCard();
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

// Handles deleting the current custom card after confirmation
function handleDeleteCard() {
  if (state.currentDeckId !== "custom" || state.cards.length === 0) {
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

// Handles exporting the custom cards deck as a downloadable JSON file
function handleExportCards() {
  const customDeck = state.decks.find((deck) => deck.id === "custom");
  const exportCards = (customDeck ? customDeck.cards : []).map((card) => ({
    question: card.question,
    answer: card.answer,
    category: card.category || "Custom"
  }));

  const exportPayload = {
    name: "My cards",
    cards: exportCards
  };

  downloadJsonFile("my-cards.json", exportPayload);
  showStatusMessage("Cards exported");
}

// Handles reading and validating an imported JSON file
function handleImportFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    try {
      const parsedData = JSON.parse(loadEvent.target.result);
      let rawList = null;

      if (Array.isArray(parsedData)) {
        rawList = parsedData;
      } else if (parsedData && typeof parsedData === "object" && Array.isArray(parsedData.cards)) {
        rawList = parsedData.cards;
      }

      if (!rawList || rawList.length === 0) {
        showStatusMessage("Invalid file");
        return;
      }

      const validList = [];
      for (const item of rawList) {
        if (!item || typeof item !== "object") {
          continue;
        }
        const qVal = validateCardText(typeof item.question === "string" ? item.question : "");
        const aVal = validateCardText(typeof item.answer === "string" ? item.answer : "");
        if (qVal.valid && aVal.valid) {
          validList.push({
            question: qVal.trimmed,
            answer: aVal.trimmed,
            category: typeof item.category === "string" && item.category.trim() ? item.category.trim() : "Custom"
          });
        }
      }

      if (validList.length === 0) {
        showStatusMessage("Invalid file");
        return;
      }

      importCustomCards(validList);
      if (state.currentDeckId !== "custom") {
        setCurrentDeck("custom");
      } else {
        updateActiveCards();
      }
      renderAll();
      showStatusMessage(`Imported ${validList.length} card${validList.length === 1 ? "" : "s"}`);
    } catch (parseError) {
      showStatusMessage("Invalid file");
    } finally {
      elements.importInput.value = "";
    }
  };

  reader.onerror = () => {
    showStatusMessage("Invalid file");
    elements.importInput.value = "";
  };

  reader.readAsText(file);
}

// Handles global keyboard shortcuts for card navigation and flipping
function handleKeyDown(event) {
  const activeEl = document.activeElement;
  const isInputActive = activeEl && (
    activeEl.tagName === "INPUT" ||
    activeEl.tagName === "TEXTAREA" ||
    activeEl.tagName === "SELECT"
  );
  const isDialogOpen = elements.addDialog && elements.addDialog.open;
  const isQuizMode = document.documentElement.getAttribute("data-mode") === "quiz";

  if (isInputActive || isDialogOpen || isQuizMode) {
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    handleNextCard();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    handlePrevCard();
  } else if (event.key === " " || event.key === "Spacebar" || event.key === "Enter") {
    if (activeEl && (activeEl.tagName === "BUTTON" || activeEl.classList.contains("file-label")) && activeEl.id !== "card") {
      return;
    }
    event.preventDefault();
    handleCardFlip();
  }
}

// Binds all DOM elements to their respective interaction handlers
function attachEventListeners() {
  elements.deckSelect.addEventListener("change", handleDeckChange);
  elements.themeToggle.addEventListener("click", handleThemeToggle);
  elements.card.addEventListener("click", handleCardFlip);
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
