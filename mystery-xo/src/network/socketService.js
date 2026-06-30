import { socket } from './socket.js'
import { SOCKET_EVENTS } from './socketEvents.js'

const listeners = new Map()

const state = {
  connected: false,
  selfPlayerId: null,
  reconnectToken: null,
  room: null,
  game: null,
  lastError: null,
}

function clone(value) {
  if (value === null || value === undefined) {
    return value
  }

  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value))
}

function normalizeRoom(payload) {
  if (!payload) {
    return null
  }

  return clone(payload.room ?? payload)
}

function notify(event, payload) {
  const handlers = listeners.get(event)

  if (!handlers) {
    return
  }

  handlers.forEach((handler) => {
    handler(payload)
  })
}

function updateRoom(payload) {
  state.room = normalizeRoom(payload)
}

function updateSelfIdentity(playerId, reconnectToken) {
  state.selfPlayerId = playerId ?? state.selfPlayerId
  state.reconnectToken = reconnectToken ?? state.reconnectToken
}

socket.on('connect', () => {
  state.connected = true
  notify('connect', getState())
})

socket.on('disconnect', () => {
  state.connected = false
  notify('disconnect', getState())
})

socket.on(SOCKET_EVENTS.ROOM_CREATED, (payload) => {
  state.lastError = null
  updateSelfIdentity(payload.playerId, payload.reconnectToken)
  updateRoom(payload)
  notify(SOCKET_EVENTS.ROOM_CREATED, { ...payload, room: state.room })
})

socket.on(SOCKET_EVENTS.ROOM_JOINED, (payload) => {
  state.lastError = null
  updateSelfIdentity(payload.playerId, payload.reconnectToken)
  updateRoom(payload)
  notify(SOCKET_EVENTS.ROOM_JOINED, { ...payload, room: state.room })
})

socket.on(SOCKET_EVENTS.ROOM_UPDATE, (payload) => {
  state.lastError = null
  updateRoom(payload)
  notify(SOCKET_EVENTS.ROOM_UPDATE, { ...payload, room: state.room })
})

socket.on(SOCKET_EVENTS.ROOM_ERROR, (payload) => {
  state.lastError = payload?.message ?? 'Room error'
  notify(SOCKET_EVENTS.ROOM_ERROR, payload)
})

socket.on('action:error', (payload) => {
  state.lastError = payload?.message ?? 'Action error'
  notify('action:error', payload)
})

socket.on(SOCKET_EVENTS.HOST_CHANGED, (payload) => {
  state.lastError = null
  if (payload?.room) {
    state.room = clone(payload.room)
  }
  notify(SOCKET_EVENTS.HOST_CHANGED, payload)
})

socket.on(SOCKET_EVENTS.MATCH_STARTING, (payload) => {
  state.lastError = null
  if (payload?.room) {
    state.room = clone(payload.room)
  }
  state.game = clone(payload?.room?.game ?? null)
  notify(SOCKET_EVENTS.MATCH_STARTING, payload)
})

socket.on(SOCKET_EVENTS.GAME_SNAPSHOT, (payload) => {
  state.lastError = null
  if (payload?.room) {
    state.room = clone(payload.room)
  }
  state.game = clone(payload?.game ?? payload?.room?.game ?? null)
  notify(SOCKET_EVENTS.GAME_SNAPSHOT, payload)
})

socket.on(SOCKET_EVENTS.BOARD_UPDATE, (payload) => {
  state.lastError = null
  if (payload?.room) {
    state.room = clone(payload.room)
  }
  state.game = clone(payload?.game ?? payload?.room?.game ?? state.room?.game ?? null)
  notify(SOCKET_EVENTS.BOARD_UPDATE, payload)
})

socket.on(SOCKET_EVENTS.TURN_STARTED, (payload) => {
  state.lastError = null
  if (payload?.room) {
    state.room = clone(payload.room)
  }
  state.game = clone(payload?.game ?? payload?.room?.game ?? state.room?.game ?? null)
  notify(SOCKET_EVENTS.TURN_STARTED, payload)
})

socket.on(SOCKET_EVENTS.STAGE_END, (payload) => {
  state.lastError = null
  if (payload?.room) {
    state.room = clone(payload.room)
  }
  state.game = clone(payload?.game ?? payload?.room?.game ?? state.room?.game ?? null)
  notify(SOCKET_EVENTS.STAGE_END, payload)
})

socket.on(SOCKET_EVENTS.MATCH_END, (payload) => {
  state.lastError = null
  if (payload?.room) {
    state.room = clone(payload.room)
  }
  state.game = clone(payload?.game ?? payload?.room?.game ?? state.room?.game ?? null)
  notify(SOCKET_EVENTS.MATCH_END, payload)
})

socket.on('connect_error', (error) => {
  state.lastError = error?.message ?? 'Connection error'
  notify('connect_error', { message: state.lastError })
})

function getState() {
  return {
    connected: state.connected,
    selfPlayerId: state.selfPlayerId,
    reconnectToken: state.reconnectToken,
    room: clone(state.room),
    game: clone(state.game),
    lastError: state.lastError,
  }
}

function on(event, handler) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set())
  }

  listeners.get(event).add(handler)

  return () => off(event, handler)
}

function off(event, handler) {
  const handlers = listeners.get(event)

  if (!handlers) {
    return
  }

  handlers.delete(handler)

  if (handlers.size === 0) {
    listeners.delete(event)
  }
}

function connect() {
  if (!socket.connected) {
    socket.connect()
  }

  return socket
}

function disconnect() {
  if (socket.connected || socket.active) {
    socket.disconnect()
  }
}

function emit(event, payload) {
  socket.emit(event, payload)
}

function request(event, payload, successEvent) {
  return new Promise((resolve, reject) => {
    const cleanup = []
    const handleSuccess = (response) => {
      cleanup.forEach((unsubscribe) => unsubscribe())
      resolve(response)
    }
    const handleError = (response) => {
      cleanup.forEach((unsubscribe) => unsubscribe())
      reject(new Error(response?.message ?? 'Request failed'))
    }

    cleanup.push(on(successEvent, handleSuccess))
    cleanup.push(on(SOCKET_EVENTS.ROOM_ERROR, handleError))
    cleanup.push(on('action:error', handleError))
    socket.emit(event, payload)
  })
}

function createRoom(playerName, maxPlayers) {
  return request(SOCKET_EVENTS.ROOM_CREATE, { playerName, maxPlayers }, SOCKET_EVENTS.ROOM_CREATED)
}

function joinRoom(roomCode, playerName) {
  return request(SOCKET_EVENTS.ROOM_JOIN, { roomCode, playerName }, SOCKET_EVENTS.ROOM_JOINED)
}

function ready() {
  emit(SOCKET_EVENTS.PLAYER_READY)
}

function unready() {
  emit(SOCKET_EVENTS.PLAYER_UNREADY)
}

function startMatch() {
  emit(SOCKET_EVENTS.MATCH_START)
}

function setTeam(team) {
  emit(SOCKET_EVENTS.ROOM_SET_TEAM, { team })
}

function leaveRoom() {
  emit(SOCKET_EVENTS.ROOM_LEAVE)
  state.room = null
  state.game = null
}

function updateSettings(patch) {
  emit(SOCKET_EVENTS.ROOM_UPDATE_SETTINGS, patch)
}

function selectCell(cellIndex) {
  const roomCode = state.room?.roomCode

  if (!roomCode) {
    throw new Error('No active room.')
  }

  emit(SOCKET_EVENTS.CELL_SELECT, {
    roomCode,
    cellIndex,
  })
}

function getRoomSnapshot() {
  return clone(state.room)
}

function getGameSnapshot() {
  return clone(state.game ?? state.room?.game ?? null)
}

function getSelfPlayerId() {
  return state.selfPlayerId
}

function getLastError() {
  return state.lastError
}

function isMultiplayerActive() {
  return Boolean(state.game ?? state.room?.game)
}

export const socketService = {
  connect,
  disconnect,
  on,
  off,
  emit,
  request,
  createRoom,
  joinRoom,
  ready,
  unready,
  startMatch,
  setTeam,
  updateSettings,
  leaveRoom,
  selectCell,
  getState,
  getRoomSnapshot,
  getGameSnapshot,
  getSelfPlayerId,
  getLastError,
  isMultiplayerActive,
}