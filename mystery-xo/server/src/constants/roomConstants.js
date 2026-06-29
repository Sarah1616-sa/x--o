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

export const ALLOWED_MAX_PLAYERS = [2, 4, 6, 8]
export const DEFAULT_TIMER_DURATION = 15
export const DEFAULT_STAGE_COUNT = 5
export const DEFAULT_QUESTION_CATEGORY = null

export const DEFAULT_SERVER_PORT = Number(process.env.PORT ?? 3001)

export const DEFAULT_CLIENT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
