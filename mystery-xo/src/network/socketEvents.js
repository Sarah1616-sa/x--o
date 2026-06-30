export const SOCKET_EVENTS = {
  ROOM_CREATED: 'room:created',
  ROOM_JOINED: 'room:joined',
  ROOM_UPDATE: 'room:update',
  ROOM_ERROR: 'room:error',
  HOST_CHANGED: 'host:changed',
  MATCH_STARTING: 'match:starting',
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_UPDATE_SETTINGS: 'room:update-settings',
  ROOM_SET_TEAM: 'room:set-team',
  ROOM_LEAVE: 'room:leave',
  MATCH_CAN_START: 'match:can-start',
  MATCH_START: 'match:start',
  PLAYER_READY: 'player:ready',
  PLAYER_UNREADY: 'player:unready',
  // In-game events — names match the authoritative server (server/src/socket.js).
  // These were referenced by socketService.js but missing here, so they resolved to
  // `undefined` and the in-game sync path could never bind. Added to complete the contract.
  CELL_SELECT: 'cell:select',
  ABILITY_ACTIVATE: 'ability:activate',
  ANSWER_SELECT: 'answer:select',
  GAME_SNAPSHOT: 'game:snapshot',
  BOARD_UPDATE: 'board:update',
  TURN_STARTED: 'turn:started',
  STAGE_END: 'stage:end',
  MATCH_END: 'match:end',
}
