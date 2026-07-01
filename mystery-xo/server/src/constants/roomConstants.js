export const ROOM_PHASES = {
  LOBBY: 'LOBBY',
  ANSWERER_SELECTION: 'ANSWERER_SELECTION',
  TURN_IDLE: 'TURN_IDLE',
  STAGE_END: 'STAGE_END',
  MATCH_END: 'MATCH_END',
}

export const TEAM_KEYS = ['X', 'O']

export const PLAYER_ROLES = {
  CAPTAIN: 'CAPTAIN',
  PARTNER: 'PARTNER',
  MEMBER: 'MEMBER',
}

// Any count is allowed within these bounds — no even-number / balanced-team rule.
export const MIN_ROOM_PLAYERS = 2
export const MAX_ROOM_PLAYERS = 10
export const DEFAULT_TIMER_DURATION = 15
export const DEFAULT_STAGE_COUNT = 3
export const DEFAULT_QUESTION_CATEGORY = null
export const DEFAULT_TEAM_COLORS = { X: '#ff3355', O: '#7dd3fc' }

export const DEFAULT_SERVER_PORT = Number(process.env.PORT ?? 3001)

export const DEFAULT_CLIENT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
