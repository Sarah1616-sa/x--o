/* ============================================================
   Question bank — organized by category.
   Pure ES module (no deps) shared by the client (lobby picker)
   and the server (validation + pool building for the engine).

   Source files (islamic.js, history.js, …) author questions in the
   authoring shape { id, text, choices:[4], correctIndex, difficulty }.
   This module attaches category metadata (label/emoji) and REMAPS each
   question to the ENGINE'S shape — do NOT rename these fields:
     { question: string, options: string[4], correctAnswerIndex: number }
   QuestionSystem reads `options` + `correctAnswerIndex`; the engine
   snapshot reads `question` (the prompt). `id` is carried through for
   traceability (unused by the engine).

   `id` on each CATEGORY is the stable key used everywhere (lobby chips,
   snapshot, validation, pool build) — label/emoji are display-only.
   ============================================================ */
import { islamic } from './islamic.js'
import { history } from './history.js'
import { geography } from './geography.js'
import { sports } from './sports.js'
import { art } from './art.js'

const CATEGORY_DEFS = [
  { id: 'islamic', label: 'إسلاميات', emoji: '🕌', source: islamic },
  { id: 'history', label: 'تاريخ', emoji: '🏛️', source: history },
  { id: 'geography', label: 'جغرافيا', emoji: '🌍', source: geography },
  { id: 'sports', label: 'رياضة', emoji: '⚽', source: sports },
  { id: 'art', label: 'فن ومشاهير', emoji: '🎨', source: art },
]

// Authoring shape → engine shape. Field names must be exact (see header).
function toEngineShape(q) {
  return { id: q.id, question: q.text, options: q.choices, correctAnswerIndex: q.correctIndex }
}

export const CATEGORIES = CATEGORY_DEFS.map((c) => ({
  id: c.id,
  label: c.label,
  emoji: c.emoji,
  questions: c.source.map(toEngineShape),
}))

const CATEGORY_BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]))

// Stable list of valid category ids — used by the lobby picker and server validation.
export const CATEGORY_IDS = CATEGORIES.map((category) => category.id)

/**
 * Union of the questions belonging to the given category ids.
 * Unknown ids are ignored; an empty/invalid selection falls back to ALL questions,
 * so the engine always receives a non-empty bank.
 */
export function buildQuestionPool(ids = []) {
  const valid = [...new Set((Array.isArray(ids) ? ids : []).filter((id) => CATEGORY_BY_ID.has(id)))]
  const chosen = valid.length ? valid : CATEGORY_IDS
  return chosen.flatMap((id) => CATEGORY_BY_ID.get(id).questions)
}

// Backward-compatible flat bank — every category flattened (the engine's default).
export const QUESTION_BANK = CATEGORIES.flatMap((category) => category.questions)
