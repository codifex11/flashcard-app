/**
 * test_interoperability.js
 * Comprehensive automated test suite verifying Anki, Quizlet, CSV, TSV, and JSON interoperability.
 * Tests functions in js/utils.js.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const utilsPath = path.join(__dirname, '..', 'js', 'utils.js');
const utilsCode = fs.readFileSync(utilsPath, 'utf8');

// Evaluate in global context
vm.runInThisContext(utilsCode);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('=== Running Interoperability Tests ===\n');

console.log('1. Testing HTML Entity Unescaper');
if (typeof unescapeHtmlEntities === 'function') {
  assert(unescapeHtmlEntities('&amp; &lt; &gt; &quot; &#39; &apos; &nbsp;') === '& < > " \' \'  ', 'unescapes standard HTML entities');
  assert(unescapeHtmlEntities('No entities here') === 'No entities here', 'preserves plain text without entities');
} else {
  console.log('  (unescapeHtmlEntities not yet defined)');
}

console.log('\n2. Testing HTML Tag Stripper');
if (typeof stripHtmlPreservingBreaks === 'function') {
  assert(stripHtmlPreservingBreaks('Line 1<br>Line 2<br/>Line 3<br />Line 4') === 'Line 1\nLine 2\nLine 3\nLine 4', 'replaces <br> variations with newline');
  assert(stripHtmlPreservingBreaks('<b>Bold</b> and <i>Italic</i>') === 'Bold and Italic', 'strips inline formatting tags');
  assert(stripHtmlPreservingBreaks('<div>First</div><div>Second</div>') === 'First\nSecond', 'replaces <div> tags with line breaks');
} else {
  console.log('  (stripHtmlPreservingBreaks not yet defined)');
}

console.log('\n3. Testing Delimiter Detector');
if (typeof detectDelimiter === 'function') {
  assert(detectDelimiter('Question\tAnswer\tCategory\nQ1\tA1\tC1') === '\t', 'detects tab delimiter');
  assert(detectDelimiter('Question,Answer,Category\nQ1,A1,C1') === ',', 'detects comma delimiter');
  assert(detectDelimiter('Question;Answer;Category\nQ1;A1;C1') === ';', 'detects semicolon delimiter');
  assert(detectDelimiter('Question|Answer|Category\nQ1|A1|C1') === '|', 'detects pipe delimiter');
} else {
  console.log('  (detectDelimiter not yet defined)');
}

console.log('\n4. Testing RFC-4180 Line Parser');
if (typeof parseDelimitedLine === 'function') {
  const line1 = parseDelimitedLine('simple,comma,separated', ',');
  assert(line1.length === 3 && line1[0] === 'simple' && line1[1] === 'comma' && line1[2] === 'separated', 'parses simple comma separated values');

  const line2 = parseDelimitedLine('"quoted, with comma","another field","third"', ',');
  assert(line2.length === 3 && line2[0] === 'quoted, with comma' && line2[1] === 'another field', 'parses quoted fields with commas');

  const line3 = parseDelimitedLine('"escaped ""quotes"" inside",test', ',');
  assert(line3.length === 2 && line3[0] === 'escaped "quotes" inside' && line3[1] === 'test', 'parses escaped double quotes correctly');

  const line4 = parseDelimitedLine('Term\tDefinition with "quotes"\tTags', '\t');
  assert(line4.length === 3 && line4[0] === 'Term' && line4[1] === 'Definition with "quotes"', 'parses tab separated line');
} else {
  console.log('  (parseDelimitedLine not yet defined)');
}

console.log('\n5. Testing parseDelimitedCards (Anki & Quizlet)');
if (typeof parseDelimitedCards === 'function') {
  // Anki TSV export
  const ankiSample = `Front\tBack\tTags\nWhat is ACID?\tAtomicity, Consistency, Isolation, Durability\tDatabase\nWhat is 2NF?\t1NF + no partial dependency\tDatabase`;
  const ankiResult = parseDelimitedCards(ankiSample);
  assert(ankiResult.length === 2, 'anki tsv parses 2 cards, skipping header');
  assert(ankiResult[0].question === 'What is ACID?' && ankiResult[0].category === 'Database', 'anki card values mapped correctly');

  // Quizlet export with HTML tags and entities
  const quizletSample = `What is <b>SQL</b>?&nbsp;\tStructured &amp; Query Language\nPrimary Key\tUnique &quot;identifier&quot;`;
  const quizletResult = parseDelimitedCards(quizletSample);
  assert(quizletResult.length === 2, 'quizlet sample parsed 2 cards');
  assert(quizletResult[0].question === 'What is SQL?' && quizletResult[0].answer === 'Structured & Query Language', 'quizlet html cleaned and entities unescaped');
  assert(quizletResult[1].answer === 'Unique "identifier"', 'quizlet entities unescaped');

  // Anki cloze and complex nested HTML
  const ankiCloze = `Who proposed {{c1::E.F. Codd}} the relational model?\tIn {{c2::1970}} at IBM\tHistory`;
  const ankiClozeResult = parseDelimitedCards(ankiCloze);
  assert(ankiClozeResult.length === 1, 'anki cloze line parsed');
  assert(ankiClozeResult[0].question === 'Who proposed E.F. Codd the relational model?', 'anki cloze question cleaned');
  assert(ankiClozeResult[0].answer === 'In 1970 at IBM', 'anki cloze answer cleaned');

  // Quizlet 2-column format (Term \t Definition)
  const quizlet2Col = `Binary Search\tO(log n) search on sorted array\nBubble Sort\tO(n^2) comparison sort`;
  const q2Result = parseDelimitedCards(quizlet2Col);
  assert(q2Result.length === 2, 'quizlet 2-column parsed 2 cards');
  assert(q2Result[0].question === 'Binary Search' && q2Result[0].category === 'Custom', 'quizlet 2-column defaults category to Custom');

  // Comma separated with quotes
  const csvSample = `"Term 1","Def 1, with comma","Custom Cat"\n"Term 2","Def 2",""`;
  const csvResult = parseDelimitedCards(csvSample);
  assert(csvResult.length === 2, 'csv sample parsed 2 cards');
  assert(csvResult[0].answer === 'Def 1, with comma' && csvResult[0].category === 'Custom Cat', 'csv card 1 values correct');

  // Multi-line quoted record in CSV
  const multilineCsv = `"Question with\nmultiple\nlines","Answer line 1\nAnswer line 2","Multi-Line"`;
  const mlResult = parseDelimitedCards(multilineCsv);
  assert(mlResult.length === 1, 'parsed multiline quoted CSV record');
  assert(mlResult[0].question === 'Question with\nmultiple\nlines', 'preserved internal newlines inside quotes');
} else {
  console.log('  (parseDelimitedCards not yet defined)');
}

console.log('\n6. Testing parseCardsFromAnyFormat');
if (typeof parseCardsFromAnyFormat === 'function') {
  // JSON array
  const jsonArr = JSON.stringify([{ question: 'JQ1', answer: 'JA1', category: 'Cat1' }]);
  const res1 = parseCardsFromAnyFormat(jsonArr, 'test.json');
  assert(res1.cards.length === 1 && res1.format === 'JSON', 'parses json array');

  // JSON wrapped
  const jsonWrapped = JSON.stringify({ name: 'Deck', cards: [{ question: 'JQ2', answer: 'JA2' }] });
  const res2 = parseCardsFromAnyFormat(jsonWrapped, 'deck.json');
  assert(res2.cards.length === 1 && res2.cards[0].question === 'JQ2', 'parses json wrapped object');

  // TSV
  const tsvData = 'Q1\tA1\nQ2\tA2';
  const res3 = parseCardsFromAnyFormat(tsvData, 'anki.tsv');
  assert(res3.cards.length === 2 && res3.format === 'TSV (Anki/Quizlet)', 'parses tsv file');
} else {
  console.log('  (parseCardsFromAnyFormat not yet defined)');
}

console.log('\n7. Testing formatCardsAsTsv & formatCardsAsCsv');
if (typeof formatCardsAsTsv === 'function' && typeof formatCardsAsCsv === 'function') {
  const cards = [
    { question: 'What is ACID?', answer: 'Atomicity, Consistency', category: 'Database' },
    { question: 'Line 1\nLine 2', answer: 'Has "quotes" and , commas', category: 'General' }
  ];
  const tsv = formatCardsAsTsv(cards);
  assert(tsv.includes('What is ACID?\tAtomicity, Consistency\tDatabase'), 'tsv includes card 1');

  const csv = formatCardsAsCsv(cards);
  assert(csv.includes('"Has ""quotes"" and , commas"'), 'csv escapes quotes properly');
} else {
  console.log('  (formatCardsAsTsv/Csv not yet defined)');
}

console.log('\n8. Testing End-to-End Roundtrip Integrity (Export -> Import)');
if (typeof formatCardsAsTsv === 'function' && typeof parseCardsFromAnyFormat === 'function') {
  const testDeck = [
    { question: 'What is 1NF?', answer: 'Atomic values and unique rows', category: 'Database' },
    { question: 'What is 2NF?', answer: '1NF plus no partial functional dependencies', category: 'Database' },
    { question: 'What is 3NF?', answer: '2NF plus no transitive dependencies', category: 'Database' }
  ];
  const exportedTsv = formatCardsAsTsv(testDeck);
  const roundtrip = parseCardsFromAnyFormat(exportedTsv, 'database.tsv');
  assert(roundtrip.success && roundtrip.cards.length === 3, 'roundtrip preserves card count');
  assert(roundtrip.cards[0].question === testDeck[0].question && roundtrip.cards[0].answer === testDeck[0].answer, 'roundtrip preserves question and answer text');
  assert(roundtrip.cards[2].category === testDeck[2].category, 'roundtrip preserves category tag');
}

console.log('\n9. Testing Weak Spot Card Factory & Pruning');
const statePath = path.join(__dirname, '..', 'js', 'state.js');
const storagePath = path.join(__dirname, '..', 'js', 'storage.js');
const storageCode = fs.readFileSync(storagePath, 'utf8');
const stateCode = fs.readFileSync(statePath, 'utf8');
vm.runInThisContext(storageCode);
vm.runInThisContext(stateCode);

if (typeof createWeakSpotCard === 'function') {
  const norm = createWeakSpotCard({ question: 'What is ACID?', answer: 'Atomicity', source: 'Slide 1' });
  assert(norm && norm.id.startsWith('weak-'), 'factory generates weak spot id');
  assert(norm.mistakeCount === 1, 'factory initializes mistake count to 1');
}

console.log(`\nTests Summary: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
