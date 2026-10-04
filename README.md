# Flashcards — Study Desk

A quiet, warm flashcard app built with plain HTML, CSS, and JavaScript. Designed like paper index cards on a study desk, it includes built-in decks for Web Development, Human Biology, and Computer Science, along with tools to create, review, import, and export custom study decks.

## Features

- **Quiz Mode (default)**: Multiple-choice quizzes generated from course material. Navigate **Department → Year → Semester → Subject → Level (Easy / Medium / Hard) → Set**, get instant feedback with explanations and slide references, and review missed questions at the end. Best scores per set are saved locally.
- **Paper Index Card Hero**: Realistic 3D flip animation, subtle ruled lines, category stamps, and card deck layering.
- **Study & Focus Modes**: Track cards with "I knew it" (sage) and "Review again" (blush), plus a dedicated "Review only" mode.
- **Card Controls**: Previous, Next, Flip, Fisher-Yates Shuffle, and Reset Order.
- **Custom Cards**: Add new cards with inline validation, delete custom cards with confirmation, export to JSON, and import JSON files.
- **Warm Themes**: Soft cream stationery light theme and deep navy-plum dark theme, honoring system preference by default.
- **Offline & Zero Dependencies**: No build steps, no external fonts, no frameworks, and no network requests.

Use the **Quiz / Flashcards** switch in the header to change modes.

## How to Run

1. Open the project folder on your computer.
2. Double-click `index.html` to open it directly in any modern browser.

### Adding or editing quiz subjects

Quiz content lives in `content/` (`index.json` plus `subjects/<id>/meta.json`, `easy.json`, `medium.json`, `hard.json`).
Browsers block loading JSON files when a page is opened by double-clicking (`file://`), so the quiz reads a bundled copy in `content/data-bundle.js`. **After adding or changing any subject, rebuild it:**

```
python tools/build_bundle.py
```

If you serve the folder over HTTP instead (e.g. `python -m http.server`), the quiz reads the JSON files directly and the bundle is only a fallback.

## Folder Structure

```
flashcard-app/
├── index.html         Main HTML structure
├── README.md          Project guide and documentation
├── assets/
│   └── favicon.svg    Index card icon
├── content/
│   ├── index.json     Department → Year → Semester → Subject hierarchy
│   ├── data-bundle.js Generated copy of all quiz content (for file://)
│   └── subjects/      One folder of quiz JSON per subject
├── tools/
│   └── build_bundle.py Rebuilds content/data-bundle.js
├── css/
│   ├── reset.css      Baseline browser style reset
│   ├── variables.css  Color tokens and theme variables
│   ├── base.css       Typography, focus rings, and button foundations
│   ├── layout.css     Desk grid and sidebar panel layout
│   ├── components.css Index cards, tactile buttons, dialog, and progress bar
│   ├── responsive.css Mobile single-column collapse and reduced-motion rules
│   └── quiz.css       Quiz mode switch, navigation tiles, questions, and results
└── js/
    ├── data.js        Built-in decks and card content
    ├── utils.js       Shuffle, text validation, and file download helpers
    ├── storage.js     Safe localStorage operations with fallbacks
    ├── state.js       Application state container and mutators
    ├── ui.js          DOM updates, card animations, and dialog states
    ├── app.js         Event listeners, keyboard shortcuts, and startup
    └── quiz.js        Quiz content loading, navigation, sessions, and scoring
```

## Keyboard Shortcuts

Flashcards mode:

- `Space` or `Enter`: Flip the current card (when not typing in form inputs)
- `Right Arrow` (`→`): Next card
- `Left Arrow` (`←`): Previous card
- `Escape`: Close the card creation dialog

Quiz mode:

- `1`–`4` or `A`–`D`: Choose an answer
- `Enter` or `Right Arrow` (`→`): Next question after answering
