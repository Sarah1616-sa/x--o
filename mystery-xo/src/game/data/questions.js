// Canonical question data now lives in ./questions/index.js (organized by category).
// This shim keeps existing `questions.js` importers working unchanged.
export { QUESTION_BANK, CATEGORIES, CATEGORY_IDS, buildQuestionPool } from './questions/index.js'
