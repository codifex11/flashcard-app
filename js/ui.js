"use strict";

/**
 * ui.js
 * Manages DOM updates, element accessibility attributes, animations, and user notifications.
 */

// Timer identifier for automatically clearing temporary status messages
let statusMessageTimer = null;

// References to cached DOM elements for fast access
const elements = {
  deckSelect: document.getElementById("deck-select"),
  themeToggle: document.getElementById("theme-toggle"),
  studyHierarchyBar: document.getElementById("study-hierarchy-bar"),
  fcBreadcrumbs: document.getElementById("fc-breadcrumbs"),
  fcDeptTag: document.getElementById("fc-dept-tag"),
  fcTermTag: document.getElementById("fc-term-tag"),
  fcSubjectTag: document.getElementById("fc-subject-tag"),
  phaseTabs: document.getElementById("phase-tabs"),
  counter: document.getElementById("counter"),
  progressBar: document.querySelector(".progress-bar"),
  progressFill: document.getElementById("progress-fill"),
  card: document.getElementById("card"),
  cardQuestion: document.getElementById("card-question"),
  cardAnswer: document.getElementById("card-answer"),
  cardSource: document.getElementById("card-source"),
  emptyMessage: document.getElementById("empty-message"),
  prevBtn: document.getElementById("prev-btn"),
  flipBtn: document.getElementById("flip-btn"),
  nextBtn: document.getElementById("next-btn"),
  shuffleBtn: document.getElementById("shuffle-btn"),
  resetOrderBtn: document.getElementById("reset-order-btn"),
  reviewOnlyToggle: document.getElementById("review-only-toggle"),
  knownBtn: document.getElementById("known-btn"),
  reviewBtn: document.getElementById("review-btn"),
  score: document.getElementById("score"),
  addCardBtn: document.getElementById("add-card-btn"),
  deleteCardBtn: document.getElementById("delete-card-btn"),
  exportBtn: document.getElementById("export-btn"),
  importInput: document.getElementById("import-input"),
  statusMessage: document.getElementById("status-message"),
  addDialog: document.getElementById("add-dialog"),
  addCardForm: document.getElementById("add-card-form"),
  newQuestion: document.getElementById("new-question"),
  newAnswer: document.getElementById("new-answer"),
  questionError: document.getElementById("question-error"),
  answerError: document.getElementById("answer-error"),
  cancelCardBtn: document.getElementById("cancel-card-btn")
};

// Populates the deck selection dropdown menu with all available decks grouped by category
function renderDeckSelect() {
  if (!elements.deckSelect) {
    return;
  }
  elements.deckSelect.innerHTML = "";
  
  const groups = {};
  for (const deck of state.decks) {
    const groupName = deck.group || "Other Decks";
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(deck);
  }

  for (const [groupName, decks] of Object.entries(groups)) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = groupName;
    for (const deck of decks) {
      const option = document.createElement("option");
      option.value = deck.id;
      option.textContent = deck.shortName ? `${deck.subjectName} — ${deck.shortName}` : deck.name;
      if (deck.id === state.currentDeckId) {
        option.selected = true;
      }
      optgroup.appendChild(option);
    }
    elements.deckSelect.appendChild(optgroup);
  }
}

// Helper to create breadcrumb separator
function createCrumbSep() {
  const sep = document.createElement("span");
  sep.className = "fc-crumb-sep";
  sep.textContent = "›";
  return sep;
}

// Renders the academic course hierarchy breadcrumb and phase pills
function renderPhaseBar() {
  if (!elements.studyHierarchyBar || !elements.phaseTabs) {
    return;
  }
  const academic = getCurrentAcademicInfo();
  if (!academic) {
    elements.studyHierarchyBar.style.display = "flex";
    if (elements.fcBreadcrumbs) {
      elements.fcBreadcrumbs.innerHTML = "";
      const browseBtn = document.createElement("button");
      browseBtn.type = "button";
      browseBtn.className = "fc-crumb-btn";
      browseBtn.style.fontWeight = "600";
      browseBtn.textContent = "\u2190 Browse Academic Courses (Department \u203a Year \u203a Semester \u203a Subject)";
      browseBtn.onclick = () => window.openHierarchyStep && window.openHierarchyStep(0);
      elements.fcBreadcrumbs.appendChild(browseBtn);
    }
    elements.phaseTabs.innerHTML = "";
    return;
  }

  elements.studyHierarchyBar.style.display = "flex";

  if (elements.fcBreadcrumbs) {
    elements.fcBreadcrumbs.innerHTML = "";

    const deptRootBtn = document.createElement("button");
    deptRootBtn.type = "button";
    deptRootBtn.className = "fc-crumb-btn";
    deptRootBtn.textContent = "Departments";
    deptRootBtn.onclick = () => window.openHierarchyStep && window.openHierarchyStep(0);
    elements.fcBreadcrumbs.appendChild(deptRootBtn);

    elements.fcBreadcrumbs.appendChild(createCrumbSep());

    const deptBtn = document.createElement("button");
    deptBtn.type = "button";
    deptBtn.className = "fc-crumb-btn";
    deptBtn.textContent = academic.deptName;
    deptBtn.onclick = () => window.openHierarchyStep && window.openHierarchyStep(1);
    elements.fcBreadcrumbs.appendChild(deptBtn);

    elements.fcBreadcrumbs.appendChild(createCrumbSep());

    const yearBtn = document.createElement("button");
    yearBtn.type = "button";
    yearBtn.className = "fc-crumb-btn";
    yearBtn.textContent = academic.yearName;
    yearBtn.onclick = () => window.openHierarchyStep && window.openHierarchyStep(2);
    elements.fcBreadcrumbs.appendChild(yearBtn);

    elements.fcBreadcrumbs.appendChild(createCrumbSep());

    const semBtn = document.createElement("button");
    semBtn.type = "button";
    semBtn.className = "fc-crumb-btn";
    semBtn.textContent = academic.semName;
    semBtn.onclick = () => window.openHierarchyStep && window.openHierarchyStep(3);
    elements.fcBreadcrumbs.appendChild(semBtn);

    elements.fcBreadcrumbs.appendChild(createCrumbSep());

    const subjBtn = document.createElement("button");
    subjBtn.type = "button";
    subjBtn.className = "fc-crumb-btn fc-subject-tag";
    subjBtn.textContent = academic.subjectName;
    subjBtn.onclick = () => window.openHierarchyStep && window.openHierarchyStep(4);
    elements.fcBreadcrumbs.appendChild(subjBtn);
  }

  elements.phaseTabs.innerHTML = "";
  for (const deck of academic.decks) {
    const isCurrent = deck.id === state.currentDeckId;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `phase-tab${isCurrent ? " is-active" : ""}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", isCurrent ? "true" : "false");
    btn.dataset.phase = String(deck.phaseNumber);
    btn.dataset.deckId = deck.id;

    const count = deck.cards ? deck.cards.length : 0;
    if (deck.phaseNumber === "all") {
      btn.textContent = `All Phases (${count})`;
    } else {
      btn.textContent = `Phase ${deck.phaseNumber}: ${deck.phaseTitle} (${count})`;
    }

    btn.addEventListener("click", () => {
      setCurrentDeck(deck.id);
      renderAll();
    });

    elements.phaseTabs.appendChild(btn);
  }
}

// Applies color theme to the HTML root and updates the toggle button icon with clean SVG
function renderTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  if (elements.themeToggle) {
    const isDark = state.theme === "dark";
    elements.themeToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );
    const iconContainer = elements.themeToggle.querySelector(".theme-icon") || elements.themeToggle;
    if (isDark) {
      iconContainer.innerHTML = `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="4"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4"/></svg>`;
    } else {
      iconContainer.innerHTML = `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 12.8A7 7 0 1 1 7.2 2.5a5.5 5.5 0 0 0 10.3 10.3z"/></svg>`;
    }
  }
}

// Updates the card counter text and the visual progress ribbon fill width
function renderProgress() {
  const total = state.cards.length;
  if (total === 0) {
    elements.counter.textContent = "0 / 0";
    elements.progressFill.style.width = "0%";
    elements.progressBar.setAttribute("aria-valuenow", "0");
    return;
  }
  const currentNum = state.currentIndex + 1;
  elements.counter.textContent = `${currentNum} / ${total}`;
  const percentage = Math.round((currentNum / total) * 100);
  elements.progressFill.style.width = `${percentage}%`;
  elements.progressBar.setAttribute("aria-valuenow", String(percentage));
}

// Renders the current flashcard, category stamps, flip state, and friendly empty state
function renderCard() {
  const hasCards = state.cards.length > 0;

  if (!hasCards) {
    elements.card.style.display = "none";
    elements.emptyMessage.hidden = false;
    let title = "";
    let desc = "";
    if (state.reviewOnly) {
      title = "All Reviewed!";
      desc = "No cards marked for review in this deck.";
    } else if (state.currentDeckId === "custom") {
      title = "Deck is Empty";
      desc = "Your custom deck is empty. Click \"Add card\" to create one!";
    } else {
      title = "Deck is Empty";
      desc = "This deck has no cards.";
    }
    elements.emptyMessage.innerHTML = `
      <svg class="empty-doodle" viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="14" y="14" width="36" height="36" rx="4" fill="var(--color-card-front)" stroke="var(--color-border)"/>
        <line x1="22" y1="24" x2="42" y2="24" stroke="var(--color-muted)"/>
        <line x1="22" y1="32" x2="34" y2="32" stroke="var(--color-muted)"/>
        <circle cx="44" cy="44" r="9" fill="var(--color-sage)" stroke="var(--color-ink)"/>
        <polyline points="40 44 43 47 48 41" stroke="var(--color-ink)"/>
      </svg>
      <span class="empty-title">${title}</span>
      <span class="empty-desc">${desc}</span>
    `;
    elements.cardQuestion.textContent = "";
    elements.cardAnswer.textContent = "";
    return;
  }

  elements.card.style.display = "";
  elements.emptyMessage.hidden = true;

  const currentCard = state.cards[state.currentIndex];
  elements.cardQuestion.textContent = currentCard.question;
  elements.cardAnswer.textContent = currentCard.answer;

  // Update corner category stamp
  const categoryFront = document.getElementById("card-category-front");
  const categoryBack = document.getElementById("card-category-back");
  const categoryText = currentCard.category || "General";
  if (categoryFront) {
    categoryFront.textContent = categoryText;
  }
  if (categoryBack) {
    categoryBack.textContent = categoryText;
  }

  // Update source reference on back
  if (elements.cardSource) {
    if (currentCard.sourceRef) {
      elements.cardSource.textContent = `📖 ${currentCard.sourceRef}`;
      elements.cardSource.style.display = "block";
    } else {
      elements.cardSource.textContent = "";
      elements.cardSource.style.display = "none";
    }
  }

  // Trigger smooth card slide-in motion
  elements.card.classList.remove("card-turn");
  void elements.card.offsetWidth;
  elements.card.classList.add("card-turn");

  if (state.isFlipped) {
    elements.card.classList.add("is-flipped");
    elements.card.setAttribute("aria-label", "Flashcard showing answer. Press to show question.");
  } else {
    elements.card.classList.remove("is-flipped");
    elements.card.setAttribute("aria-label", "Flashcard showing question. Press to show answer.");
  }
}

// Updates enabled/disabled states for navigation, shuffle, flip, and delete buttons
function renderButtonStates() {
  const totalCards = state.cards.length;
  const hasMultipleCards = totalCards >= 2;
  const hasCards = totalCards > 0;

  elements.prevBtn.disabled = !hasMultipleCards;
  elements.nextBtn.disabled = !hasMultipleCards;
  elements.flipBtn.disabled = !hasCards;
  elements.shuffleBtn.disabled = !hasCards;
  elements.resetOrderBtn.disabled = !hasCards;
  elements.knownBtn.disabled = !hasCards;
  elements.reviewBtn.disabled = !hasCards;

  // Deletion is strictly allowed for cards in the custom deck
  elements.deleteCardBtn.disabled = !hasCards || state.currentDeckId !== "custom";
}

// Updates the live study score counter displaying known and review counts with gentle bounce
function renderScore() {
  const deckId = state.currentDeckId;
  const knownCount = (state.known[deckId] || []).length;
  const reviewCount = (state.review[deckId] || []).length;
  const newScoreText = `Known: ${knownCount} · Review: ${reviewCount}`;

  if (elements.score.textContent !== newScoreText) {
    elements.score.textContent = newScoreText;
    elements.score.classList.remove("score-bounce");
    void elements.score.offsetWidth;
    elements.score.classList.add("score-bounce");
  }
}

// Synchronizes the review-only study mode checkbox state
function renderReviewToggle() {
  elements.reviewOnlyToggle.checked = state.reviewOnly;
}

// Performs a complete UI render across all visual components
function renderAll() {
  renderTheme();
  renderDeckSelect();
  renderPhaseBar();
  renderProgress();
  renderCard();
  renderButtonStates();
  renderScore();
  renderReviewToggle();
}

// Displays a polite status message that automatically clears after 4 seconds
function showStatusMessage(text) {
  if (statusMessageTimer) {
    clearTimeout(statusMessageTimer);
    statusMessageTimer = null;
  }
  elements.statusMessage.textContent = text;
  statusMessageTimer = setTimeout(() => {
    elements.statusMessage.textContent = "";
    statusMessageTimer = null;
  }, 4000);
}

// Opens the add card modal dialog and focuses the first input field
function openAddCardDialog() {
  clearFormErrors();
  elements.addCardForm.reset();
  elements.addDialog.showModal();
  elements.newQuestion.focus();
}

// Closes the add card modal dialog and resets all inputs
function closeAddCardDialog() {
  elements.addDialog.close();
  elements.addCardForm.reset();
  clearFormErrors();
}

// Sets the validation error message below the question textarea
function setQuestionError(errorMessage) {
  elements.questionError.textContent = errorMessage;
}

// Sets the validation error message below the answer textarea
function setAnswerError(errorMessage) {
  elements.answerError.textContent = errorMessage;
}

// Clears all form validation error messages
function clearFormErrors() {
  elements.questionError.textContent = "";
  elements.answerError.textContent = "";
}
