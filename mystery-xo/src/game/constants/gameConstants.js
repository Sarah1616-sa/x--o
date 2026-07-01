export const QUESTION_TIME_LIMIT = 15
// Max selectable rounds (stages) per match. The actual round count comes from
// room.settings.stageCount; this is the upper bound (and the GameEngine fallback).
export const MAX_STAGES = 5

// Same-cell ability collision (فخ-vs-فخ or فخ-vs-باور): a timed announcement popup
// shows for this many seconds (no button) before the shared challenge question opens
// for BOTH teams. The server may override the duration via COLLISION_ANNOUNCE_SECONDS.
export const COLLISION_ANNOUNCE_SECONDS = 12
// Case A — both teams trapped the same cell.
export const COLLISION_TEXT_A = 'فخخناها كلنا، والحين نشوف من يعرف يلعبها صح'
// Case B — one team trapped the cell, the other used باور on it.
export const COLLISION_TEXT_B = '، كأنك يا أبو زيد ما غزيت… الأرض مفخّخة، ما تاخذها بالساهل'
