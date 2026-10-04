"use strict";

/**
 * quiz.js
 * Quiz mode: loads generated quiz content (content/index.json and
 * content/subjects/<id>/*.json), drives the Department -> Year -> Semester ->
 * Subject -> Level -> Set navigation, and runs multiple-choice sessions.
 *
 * Data source: when the app is served over http(s) the JSON files are fetched
 * directly; when index.html is opened from disk (file://) browsers block
 * fetch(), so the pre-built window.APP_DATA_BUNDLE (content/data-bundle.js)
 * is used instead.
 */
(function () {
  // Order of navigation choices; truncating this path is how "going back" works
  const PATH_KEYS = ["dept", "year", "sem", "subject", "level", "set"];
  const LEVELS = [
    { id: "easy", name: "Easy", desc: "Direct recall of definitions and facts." },
    { id: "medium", name: "Medium", desc: "Apply concepts and trace short code." },
    { id: "hard", name: "Hard", desc: "Analyze edge cases and compare ideas." }
  ];
  const LETTERS = ["A", "B", "C", "D"];
  const MODE_KEY = "flashcards.mode";
  const SCORES_KEY = "flashcards.quizScores";
  const CAN_FETCH = location.protocol === "http:" || location.protocol === "https:";

  // Quiz state, kept separate from the flashcard state in state.js
  const quiz = {
    status: "loading",   // loading | ready | error
    error: "",
    index: null,         // parsed content/index.json
    subjects: {},        // subjectId -> { meta, easy, medium, hard }
    loadingSubject: false,
    subjectError: "",
    path: { dept: null, year: null, sem: null, subject: null, level: null, set: null },
    session: null        // { questions, current, answers[], finished }
  };

  const dom = {
    view: document.getElementById("quiz-view"),
    crumbs: document.getElementById("quiz-crumbs"),
    panel: document.getElementById("quiz-panel"),
    modeButtons: document.querySelectorAll(".mode-btn")
  };

  /* ---------- Data loading ---------- */

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.json();
  }

  function getBundle() {
    return window.APP_DATA_BUNDLE || null;
  }

  async function loadIndex() {
    if (CAN_FETCH) {
      try {
        return await fetchJson("content/index.json");
      } catch (err) {
        console.warn("Falling back to data bundle for index:", err);
      }
    }
    const bundle = getBundle();
    if (bundle && bundle.index) {
      return bundle.index;
    }
    throw new Error("Quiz content could not be loaded.");
  }

  async function loadSubject(id) {
    if (quiz.subjects[id]) {
      return quiz.subjects[id];
    }
    let data = null;
    if (CAN_FETCH) {
      try {
        const base = `content/subjects/${encodeURIComponent(id)}/`;
        const [meta, easy, medium, hard] = await Promise.all(
          ["meta", "easy", "medium", "hard"].map((name) => fetchJson(`${base}${name}.json`))
        );
        data = { meta, easy, medium, hard };
      } catch (err) {
        console.warn(`Falling back to data bundle for subject "${id}":`, err);
      }
    }
    if (!data) {
      const bundle = getBundle();
      if (bundle && bundle.subjects && bundle.subjects[id]) {
        data = bundle.subjects[id];
      }
    }
    if (!data) {
      throw new Error(`The questions for this subject could not be loaded.`);
    }
    quiz.subjects[id] = data;
    return data;
  }

  /* ---------- Score persistence ---------- */

  function readScores() {
    try {
      return JSON.parse(localStorage.getItem(SCORES_KEY)) || {};
    } catch (err) {
      return {};
    }
  }

  function scoreKey(subjectId, level, setNumber) {
    return `${subjectId}|${level}|${setNumber}`;
  }

  function getScore(subjectId, level, setNumber) {
    return readScores()[scoreKey(subjectId, level, setNumber)] || null;
  }

  function saveScore(subjectId, level, setNumber, correct, total) {
    const all = readScores();
    const key = scoreKey(subjectId, level, setNumber);
    const prev = all[key];
    all[key] = {
      best: prev ? Math.max(prev.best, correct) : correct,
      last: correct,
      total,
      attempts: (prev ? prev.attempts : 0) + 1
    };
    try {
      localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    } catch (err) {
      // Storage may be unavailable (private mode); scores simply won't persist
    }
  }

  /* ---------- Small helpers ---------- */

  // Creates an element with props and children; text is always set safely via textContent
  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (value === null || value === undefined || value === false) {
          continue;
        }
        if (key === "class") {
          node.className = value;
        } else if (key === "text") {
          node.textContent = value;
        } else if (key.startsWith("on") && typeof value === "function") {
          node.addEventListener(key.slice(2), value);
        } else {
          node.setAttribute(key, value === true ? "" : value);
        }
      }
    }
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) {
        continue;
      }
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  // Renders `backtick` segments in question text as inline code
  function richText(text) {
    return String(text).split("`").map((part, i) =>
      i % 2 ? h("code", { text: part }) : document.createTextNode(part)
    );
  }

  function plural(count, word) {
    return `${count} ${word}${count === 1 ? "" : "s"}`;
  }

  // Sorts labels like "Year 2" / "Semester 1" numerically, then alphabetically
  function sortByNumber(list, getLabel) {
    const num = (label) => {
      const match = String(label).match(/\d+/);
      return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
    };
    return [...list].sort((a, b) =>
      num(getLabel(a)) - num(getLabel(b)) || String(getLabel(a)).localeCompare(String(getLabel(b)))
    );
  }

  function levelInfo(levelId) {
    return LEVELS.find((level) => level.id === levelId) || { id: levelId, name: levelId, desc: "" };
  }

  function currentSubjectData() {
    return quiz.path.subject ? quiz.subjects[quiz.path.subject.id] : null;
  }

  function currentLevelData() {
    const data = currentSubjectData();
    return data && quiz.path.level ? data[quiz.path.level] : null;
  }

  function countCorrect(session) {
    return session.answers.filter((answer, i) => answer !== null && answer === session.questions[i].correctIndex).length;
  }

  /* ---------- Navigation ---------- */

  function isFlashcardsMode() {
    return document.documentElement.getAttribute("data-mode") === "flashcards";
  }

  function currentStep() {
    if (quiz.status !== "ready") {
      return quiz.status;
    }
    const p = quiz.path;
    if (!p.dept) return "dept";
    if (!p.year) return "year";
    if (!p.sem) return "sem";
    if (!p.subject) return "subject";
    if (quiz.loadingSubject) return "loading";
    if (quiz.subjectError) return "subjectError";

    if (isFlashcardsMode()) {
      return "phase";
    }

    if (!p.level) return "level";
    if (p.set === null) return "set";
    if (quiz.session && quiz.session.finished) return "results";
    return "question";
  }

  // Selects a value at one navigation depth and clears everything after it
  function choose(key, value) {
    const depth = PATH_KEYS.indexOf(key);
    PATH_KEYS.slice(depth + 1).forEach((k) => { quiz.path[k] = null; });
    quiz.path[key] = value;
    quiz.session = null;
    quiz.subjectError = "";

    if (key === "subject") {
      loadSelectedSubject();
      return;
    }
    if (key === "set") {
      startSession();
    }
    render({ focus: "heading" });
  }

  // Goes back by keeping only the first `keep` navigation choices
  function truncatePath(keep) {
    if (!confirmLeaveSession()) {
      return;
    }
    if (isFlashcardsMode()) {
      document.documentElement.classList.add("fc-picking");
    }
    PATH_KEYS.slice(keep).forEach((k) => { quiz.path[k] = null; });
    quiz.session = null;
    quiz.subjectError = "";
    render({ focus: "heading" });
  }

  // Expose global hierarchy navigation for flashcards breadcrumbs
  window.openHierarchyStep = function (keep) {
    document.documentElement.classList.add("fc-picking");
    truncatePath(keep);
  };

  function confirmLeaveSession() {
    const session = quiz.session;
    if (!session || session.finished) {
      return true;
    }
    const answered = session.answers.filter((answer) => answer !== null).length;
    return answered === 0 || window.confirm("Leave this set? Your progress in this attempt will be lost.");
  }

  async function loadSelectedSubject() {
    const entry = quiz.path.subject;
    if (!quiz.subjects[entry.id]) {
      quiz.loadingSubject = true;
      render({ focus: null });
      try {
        await loadSubject(entry.id);
      } catch (err) {
        quiz.subjectError = err.message;
      }
      quiz.loadingSubject = false;
      if (quiz.path.subject !== entry) {
        return; // User navigated elsewhere while loading
      }
    }
    render({ focus: "heading" });
  }

  /* ---------- Quiz session ---------- */

  function startSession() {
    const level = currentLevelData();
    const set = level ? level.sets.find((s) => s.setNumber === quiz.path.set) : null;
    const questions = set ? set.questions : [];
    quiz.session = {
      questions,
      current: 0,
      answers: new Array(questions.length).fill(null),
      finished: false
    };
  }

  function answer(optionIndex) {
    const session = quiz.session;
    if (!session || session.finished || session.answers[session.current] !== null) {
      return;
    }
    session.answers[session.current] = optionIndex;
    render({ focus: "next" });
  }

  function nextQuestion() {
    const session = quiz.session;
    if (!session || session.answers[session.current] === null) {
      return;
    }
    if (session.current + 1 < session.questions.length) {
      session.current += 1;
    } else {
      session.finished = true;
      saveScore(quiz.path.subject.id, quiz.path.level, quiz.path.set, countCorrect(session), session.questions.length);
    }
    render({ focus: "heading" });
  }

  // Opens the flashcard study desk for the given phase number ("1".."5" or "all")
  function openFlashcardDesk(phaseNumber) {
    const subjId = quiz.path.subject.id;
    const targetDeckId = phaseNumber === "all" ? `${subjId}-all` : `${subjId}-p${phaseNumber}`;
    document.documentElement.classList.remove("fc-picking");
    if (typeof setCurrentDeck === "function") {
      setCurrentDeck(targetDeckId);
    }
    if (typeof renderAll === "function") {
      renderAll();
    }
  }

  // Suggests the next set in this level, or the first set of the next level
  function findNextAction() {
    const level = currentLevelData();
    const nextSet = level.sets.find((s) => s.setNumber === quiz.path.set + 1);
    if (nextSet) {
      return { label: `Next: Set ${nextSet.setNumber} \u2192`, run: () => choose("set", nextSet.setNumber) };
    }
    const data = currentSubjectData();
    const levelIdx = LEVELS.findIndex((l) => l.id === quiz.path.level);
    const nextLevel = LEVELS.slice(levelIdx + 1).find((l) => data[l.id]);
    if (nextLevel) {
      return { label: `Next level: ${nextLevel.name} \u2192`, run: () => choose("level", nextLevel.id) };
    }
    return null;
  }

  /* ---------- Rendering ---------- */

  function render({ focus } = {}) {
    renderCrumbs();
    dom.panel.replaceChildren(buildStep());
    if (focus === "heading") {
      const heading = dom.panel.querySelector(".quiz-heading");
      if (heading) heading.focus();
    } else if (focus === "next") {
      const next = dom.panel.querySelector(".quiz-next");
      if (next) next.focus();
    }
  }

  function renderCrumbs() {
    const p = quiz.path;
    const isFc = isFlashcardsMode();
    const items = [{ label: "Departments", keep: 0 }];
    if (p.dept) items.push({ label: p.dept.name, keep: 1 });
    if (p.year) items.push({ label: p.year.year, keep: 2 });
    if (p.sem) items.push({ label: p.sem.semester, keep: 3 });
    if (p.subject) items.push({ label: p.subject.name, keep: 4 });
    if (!isFc) {
      if (p.level) items.push({ label: levelInfo(p.level).name, keep: 5 });
      if (p.set !== null) items.push({ label: `Set ${p.set}`, keep: 6 });
    }

    dom.crumbs.replaceChildren(...items.map((item, i) => {
      const isLast = i === items.length - 1;
      return h("li", { class: "quiz-crumb" },
        isLast
          ? h("span", { class: "quiz-crumb-current", "aria-current": "page", text: item.label })
          : h("button", { type: "button", class: "quiz-crumb-btn", onclick: () => truncatePath(item.keep), text: item.label })
      );
    }));
  }

  function buildStep() {
    switch (currentStep()) {
      case "loading": return h("p", { class: "quiz-loading", role: "status", text: "Loading questions\u2026" });
      case "error": return stepError();
      case "dept": return stepDepartments();
      case "year": return stepYears();
      case "sem": return stepSemesters();
      case "subject": return stepSubjects();
      case "subjectError": return stepSubjectError();
      case "phase": return stepPhases();
      case "level": return stepLevels();
      case "set": return stepSets();
      case "question": return stepQuestion();
      case "results": return stepResults();
      default: return h("p", { text: "" });
    }
  }

  function section(stepLabel, title, subtitle, ...content) {
    return h("div", { class: "quiz-step" },
      h("header", { class: "quiz-step-head" },
        stepLabel ? h("p", { class: "quiz-step-label", text: stepLabel }) : null,
        h("h2", { class: "quiz-heading", id: "quiz-heading", tabindex: "-1", text: title }),
        subtitle ? h("p", { class: "quiz-subtext", text: subtitle }) : null
      ),
      ...content
    );
  }

  function grid(tiles) {
    return h("div", { class: "quiz-grid" }, tiles);
  }

  function tile({ title, meta, badge, level, onClick }) {
    return h("button", { type: "button", class: "quiz-tile", "data-level": level || null, onclick: onClick },
      h("span", { class: "quiz-tile-title", text: title }),
      meta ? h("span", { class: "quiz-tile-meta", text: meta }) : null,
      badge ? h("span", { class: "quiz-tile-badge", text: badge }) : null
    );
  }

  function stepError() {
    return section(null, "Couldn't load quiz content", quiz.error,
      h("p", { class: "quiz-subtext", text: "If you opened index.html directly, make sure content/data-bundle.js exists (run: python tools/build_bundle.py)." })
    );
  }

  function stepSubjectError() {
    return section(null, "Couldn't load this subject", quiz.subjectError,
      h("div", { class: "quiz-actions" },
        h("button", { type: "button", class: "quiz-btn-quiet", onclick: () => truncatePath(3), text: "\u2190 Back to subjects" })
      )
    );
  }

  function stepDepartments() {
    const depts = sortByNumber(quiz.index.departments || [], (d) => d.name);
    if (!depts.length) {
      return section(null, "No subjects yet", "Generate quiz content into the content/ folder and it will appear here.");
    }
    const isFc = isFlashcardsMode();
    return section(isFc ? "Step 1 of 5 · Flashcards" : "Step 1 of 4 · Quiz", "Choose your department", "Pick the department you are studying in.",
      grid(depts.map((dept) => tile({
        title: dept.name,
        meta: `${plural((dept.years || []).length, "year")} available`,
        onClick: () => choose("dept", dept)
      })))
    );
  }

  function stepYears() {
    const years = sortByNumber(quiz.path.dept.years || [], (y) => y.year);
    const isFc = isFlashcardsMode();
    return section(isFc ? "Step 2 of 5 · Flashcards" : "Step 2 of 4 · Quiz", "Choose your year", quiz.path.dept.name,
      grid(years.map((year) => tile({
        title: year.year,
        meta: plural((year.semesters || []).length, "semester"),
        onClick: () => choose("year", year)
      })))
    );
  }

  function stepSemesters() {
    const semesters = sortByNumber(quiz.path.year.semesters || [], (s) => s.semester);
    const isFc = isFlashcardsMode();
    return section(isFc ? "Step 3 of 5 · Flashcards" : "Step 3 of 4 · Quiz", "Choose your semester", `${quiz.path.dept.name} \u00b7 ${quiz.path.year.year}`,
      grid(semesters.map((sem) => tile({
        title: sem.semester,
        meta: plural((sem.subjects || []).length, "subject"),
        onClick: () => choose("sem", sem)
      })))
    );
  }

  function stepSubjects() {
    const p = quiz.path;
    const subjects = [...(p.sem.subjects || [])].sort((a, b) => a.name.localeCompare(b.name));
    const isFc = isFlashcardsMode();
    return section(isFc ? "Step 4 of 5 · Flashcards" : "Step 4 of 4 · Quiz", "Choose your subject", `${p.dept.name} \u00b7 ${p.year.year} \u00b7 ${p.sem.semester}`,
      grid(subjects.map((subject) => tile({
        title: subject.name,
        meta: isFc ? "50 concept flashcards \u00b7 5 phases" : `${plural(subject.questionCount || 0, "question")} \u00b7 3 levels`,
        badge: subject.reviewStatus && subject.reviewStatus !== "approved" ? "Pending review" : null,
        onClick: () => choose("subject", subject)
      })))
    );
  }

  function stepPhases() {
    const subjId = quiz.path.subject.id;
    const bundle = getBundle();
    let flashcards = null;
    const subjData = currentSubjectData();
    if (subjData && subjData.flashcards) {
      flashcards = subjData.flashcards;
    } else if (bundle && bundle.subjects && bundle.subjects[subjId] && bundle.subjects[subjId].flashcards) {
      flashcards = bundle.subjects[subjId].flashcards;
    }

    const phases = flashcards && Array.isArray(flashcards.phases) ? flashcards.phases : [];
    if (!phases.length) {
      return section("Study Flashcards", quiz.path.subject.name, "No flashcards found for this subject.",
        h("div", { class: "quiz-actions" },
          h("button", { type: "button", class: "quiz-btn-quiet", onclick: () => truncatePath(3), text: "\u2190 Back to subjects" })
        )
      );
    }

    const totalCards = phases.reduce((sum, p) => sum + (p.cards ? p.cards.length : 0), 0);
    const tiles = phases.map((phase) => {
      const count = (phase.cards || []).length;
      return tile({
        title: `Phase ${phase.phaseNumber}: ${phase.title}`,
        meta: `${count} concept flashcards`,
        badge: `Phase ${phase.phaseNumber} of ${phases.length}`,
        onClick: () => openFlashcardDesk(phase.phaseNumber)
      });
    });

    tiles.push(tile({
      title: "All Phases Combined",
      meta: `${totalCards} flashcards total`,
      badge: "Full Course Deck",
      onClick: () => openFlashcardDesk("all")
    }));

    return section(
      "Step 5 of 5 · Study Phases",
      `Choose Study Phase for ${quiz.path.subject.name}`,
      "Pick a 10-card concept phase or study all 50 flashcards together.",
      grid(tiles),
      h("div", { class: "quiz-actions", style: "margin-top: 1.25rem" },
        h("button", { type: "button", class: "quiz-btn-quiet", onclick: () => truncatePath(3), text: "\u2190 Back to subjects" }),
        h("button", { type: "button", class: "quiz-btn-quiet", onclick: () => setMode("quiz"), text: "Take Quiz for this subject \u2192" })
      )
    );
  }

  function stepLevels() {
    const data = currentSubjectData();
    const subjectId = quiz.path.subject.id;
    const tiles = LEVELS.filter((level) => data[level.id]).map((level) => {
      const sets = data[level.id].sets || [];
      const questionCount = sets.reduce((sum, s) => sum + s.questions.length, 0);
      const done = sets.filter((s) => getScore(subjectId, level.id, s.setNumber)).length;
      return tile({
        title: level.name,
        meta: `${level.desc} ${plural(sets.length, "set")} \u00b7 ${questionCount} questions.`,
        badge: done ? `${done} of ${sets.length} sets done` : null,
        level: level.id,
        onClick: () => choose("level", level.id)
      });
    });
    return section("Choose difficulty", quiz.path.subject.name, "Pick a level to see its question sets.", grid(tiles));
  }

  function stepSets() {
    const level = currentLevelData();
    const subjectId = quiz.path.subject.id;
    return section(`${levelInfo(quiz.path.level).name} level`, "Choose a question set", "Every set has different questions \u2014 nothing repeats.",
      grid(level.sets.map((set) => {
        const score = getScore(subjectId, quiz.path.level, set.setNumber);
        return tile({
          title: `Set ${set.setNumber}`,
          meta: plural(set.questions.length, "question"),
          badge: score ? `Best ${score.best}/${score.total}` : null,
          level: quiz.path.level,
          onClick: () => choose("set", set.setNumber)
        });
      }))
    );
  }

  function progressBar(fraction) {
    const pct = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
    return h("div", { class: "quiz-progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct), "aria-label": "Set progress" },
      h("div", { class: "quiz-progress-fill", style: `width: ${pct}%` })
    );
  }

  function feedback(question, chosen) {
    const isCorrect = chosen === question.correctIndex;
    return h("div", { class: `quiz-feedback ${isCorrect ? "is-correct" : "is-wrong"}`, role: "status" },
      h("p", { class: "quiz-feedback-title", text: isCorrect ? "Correct!" : `Not quite \u2014 the answer is ${LETTERS[question.correctIndex]}.` }),
      h("p", { class: "quiz-feedback-text" }, richText(question.explanation)),
      question.sourceRef ? h("p", { class: "quiz-source", text: `Source: ${question.sourceRef}` }) : null
    );
  }

  function stepQuestion() {
    const session = quiz.session;
    const total = session.questions.length;
    if (!total) {
      return section(null, "This set has no questions", "",
        h("div", { class: "quiz-actions" },
          h("button", { type: "button", class: "quiz-btn-quiet", onclick: () => truncatePath(5), text: "\u2190 Back to sets" })
        )
      );
    }
    const question = session.questions[session.current];
    const chosen = session.answers[session.current];
    const answered = chosen !== null;
    const isLast = session.current + 1 === total;

    const options = h("div", { class: `quiz-options${answered ? " is-locked" : ""}`, role: "group", "aria-label": "Answer options" },
      question.options.map((option, i) => {
        let cls = "quiz-option";
        if (answered && i === question.correctIndex) cls += " is-correct";
        else if (answered && i === chosen) cls += " is-wrong";
        return h("button", { type: "button", class: cls, disabled: answered, onclick: () => answer(i) },
          h("span", { class: "quiz-option-letter", "aria-hidden": "true", text: LETTERS[i] }),
          h("span", { class: "quiz-option-text" }, richText(option))
        );
      })
    );

    return h("div", { class: "quiz-step" },
      h("div", { class: "quiz-q-top" },
        h("p", { class: "quiz-q-counter", text: `Question ${session.current + 1} of ${total}` }),
        h("p", { class: "quiz-q-score", text: `${levelInfo(quiz.path.level).name} \u00b7 Set ${quiz.path.set} \u00b7 Correct: ${countCorrect(session)}` })
      ),
      progressBar((session.current + (answered ? 1 : 0)) / total),
      h("h2", { class: "quiz-question quiz-heading", id: "quiz-heading", tabindex: "-1" }, richText(question.question)),
      question.confidence === "low"
        ? h("p", { class: "quiz-warning", text: "Low-confidence question \u2014 double-check it against your course notes." })
        : null,
      options,
      answered ? feedback(question, chosen) : h("p", { class: "quiz-hint", text: "Tip: press 1\u20134 or A\u2013D to answer." }),
      h("div", { class: "quiz-actions" },
        h("button", { type: "button", class: "quiz-btn-quiet", onclick: () => truncatePath(5), text: "Quit set" }),
        answered
          ? h("button", { type: "button", class: "quiz-btn-primary quiz-next", onclick: nextQuestion, text: isLast ? "See results" : "Next question \u2192" })
          : null
      )
    );
  }

  function stepResults() {
    const session = quiz.session;
    const total = session.questions.length;
    const correct = countCorrect(session);
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const score = getScore(quiz.path.subject.id, quiz.path.level, quiz.path.set);
    const missed = session.questions
      .map((question, i) => ({ question, chosen: session.answers[i] }))
      .filter((item) => item.chosen !== item.question.correctIndex);
    const nextAction = findNextAction();

    let message = "Review the material and try again.";
    if (pct >= 90) message = "Excellent work!";
    else if (pct >= 70) message = "Great job \u2014 almost there.";
    else if (pct >= 50) message = "Good effort \u2014 keep practicing.";

    const review = missed.length
      ? h("ol", { class: "quiz-review-list" }, missed.map(({ question, chosen }) =>
          h("li", { class: "quiz-review-item" },
            h("p", { class: "quiz-review-q" }, richText(question.question)),
            h("p", { class: "quiz-review-yours" }, `Your answer: ${LETTERS[chosen]}. `, richText(question.options[chosen])),
            h("p", { class: "quiz-review-correct" }, `Correct answer: ${LETTERS[question.correctIndex]}. `, richText(question.options[question.correctIndex])),
            h("p", { class: "quiz-review-expl" }, richText(question.explanation)),
            question.sourceRef ? h("p", { class: "quiz-source", text: `Source: ${question.sourceRef}` }) : null
          )
        ))
      : h("p", { class: "quiz-subtext", text: "Perfect score \u2014 nothing to review." });

    return h("div", { class: "quiz-step" },
      h("header", { class: "quiz-step-head" },
        h("p", { class: "quiz-step-label", text: `${levelInfo(quiz.path.level).name} \u00b7 Set ${quiz.path.set} complete` }),
        h("h2", { class: "quiz-heading", id: "quiz-heading", tabindex: "-1", text: message })
      ),
      h("div", { class: "quiz-result-head" },
        h("p", { class: "quiz-result-score", text: `${correct} / ${total}` }),
        h("div", { class: "quiz-result-meta" },
          h("p", { text: `${pct}% correct` }),
          score ? h("p", { class: "quiz-subtext", text: `Best: ${score.best}/${score.total} \u00b7 Attempts: ${score.attempts}` }) : null
        )
      ),
      progressBar(correct / (total || 1)),
      h("div", { class: "quiz-actions" },
        h("div", { class: "quiz-actions-group" },
          h("button", { type: "button", class: "quiz-btn-quiet", onclick: () => choose("set", quiz.path.set), text: "Retry set" }),
          h("button", { type: "button", class: "quiz-btn-quiet", onclick: () => truncatePath(5), text: "All sets" })
        ),
        nextAction ? h("button", { type: "button", class: "quiz-btn-primary", onclick: nextAction.run, text: nextAction.label }) : null
      ),
      h("h3", { class: "quiz-review-heading", text: missed.length ? `Review ${plural(missed.length, "missed question")}` : "Review" }),
      review
    );
  }

  /* ---------- Mode switching & keyboard ---------- */

  function setMode(mode) {
    const next = mode === "flashcards" ? "flashcards" : "quiz";
    document.documentElement.setAttribute("data-mode", next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch (err) {
      // Ignore storage failures; mode just won't be remembered
    }
    dom.modeButtons.forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.mode === next)));

    if (next === "flashcards" && quiz.path && quiz.path.subject) {
      const subjId = quiz.path.subject.id;
      const targetDeckId = `${subjId}-p1`;
      if (typeof state !== "undefined" && state.decks && state.decks.some((d) => d.id === targetDeckId)) {
        if (state.currentDeckId && !state.currentDeckId.startsWith(subjId)) {
          if (typeof setCurrentDeck === "function" && typeof renderAll === "function") {
            setCurrentDeck(targetDeckId);
            renderAll();
          }
        }
      }
    }
  }

  function handleQuizKeys(event) {
    if (document.documentElement.getAttribute("data-mode") !== "quiz") return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const active = document.activeElement;
    if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;
    if (currentStep() !== "question" || !quiz.session.questions.length) return;

    const session = quiz.session;
    const key = event.key.toLowerCase();
    if (session.answers[session.current] === null) {
      let idx = ["1", "2", "3", "4"].indexOf(key);
      if (idx === -1) idx = ["a", "b", "c", "d"].indexOf(key);
      if (idx !== -1 && idx < session.questions[session.current].options.length) {
        event.preventDefault();
        answer(idx);
      }
    } else if (key === "arrowright" || (key === "enter" && !(active && active.tagName === "BUTTON"))) {
      event.preventDefault();
      nextQuestion();
    }
  }

  async function init() {
    if (!dom.view || !dom.panel || !dom.crumbs) {
      return;
    }
    dom.modeButtons.forEach((btn) => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
    setMode(document.documentElement.getAttribute("data-mode"));
    window.addEventListener("keydown", handleQuizKeys);

    render();
    try {
      quiz.index = await loadIndex();
      quiz.status = "ready";
    } catch (err) {
      quiz.status = "error";
      quiz.error = err.message;
    }
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
