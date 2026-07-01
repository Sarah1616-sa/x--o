import { roomManager } from './rooms/roomManager.js'
import { validateCategoryIds, validateMaxPlayers, validatePlayerName, validateRoomCode, validateRoomSettingsPatch } from './validators/roomValidators.js'

// A dropped socket (reload / blip) has this long to reconnect with its token before the
// player is actually removed (and, mid-match, the match forfeits). Keyed by playerId so a
// reconnect can cancel a pending removal. Override with RECONNECT_GRACE_MS (ms) — handy for tests.
const RECONNECT_GRACE_MS = Number(process.env.RECONNECT_GRACE_MS) || 30_000
const removalTimers = new Map()

function cancelRemovalTimer(playerId) {
  const timer = removalTimers.get(playerId)
  if (timer) {
    clearTimeout(timer)
    removalTimers.delete(playerId)
  }
}

function emitSocketError(socket, event, message) {
  socket.emit(event, {
    ok: false,
    message,
  })
}

function broadcastRoomUpdate(io, room) {
  const snapshot = roomManager.buildRoomSnapshot(room)
  io.to(room.roomCode).emit('room:update', {
    ...snapshot,
    room: snapshot,
  })
}

function broadcastHostChanged(io, room) {
  const snapshot = roomManager.buildRoomSnapshot(room)
  io.to(room.roomCode).emit('host:changed', {
    hostPlayerId: snapshot.hostPlayerId,
    hostPlayerName: snapshot.hostPlayerName,
    room: snapshot,
  })
}

// The authoritative game snapshot — the single in-game state event clients render from.
// Sent PER PLAYER (scoped to their team) so a placed trap stays hidden from the enemy:
// each team only ever receives its own trap squares and never sees the other team's
// trap flip to 'used'.
function broadcastGameSnapshot(io, room) {
  for (const player of Object.values(room.players)) {
    if (!player.connected || !player.socketId) continue
    const snapshot = roomManager.buildRoomSnapshot(room, player.team)
    io.to(player.socketId).emit('game:snapshot', {
      room: snapshot,
      game: snapshot.game,
    })
  }
}

// Kicks off a room whose engine has already been built (by beginMatch/startMatch):
// wire the engine broadcaster, announce the transition, then start its timers.
function launchMatch(io, room) {
  room.engine.emit = () => broadcastGameSnapshot(io, room)
  io.to(room.roomCode).emit('match:starting', {
    phase: room.phase,
    room: roomManager.buildRoomSnapshot(room),
  })
  broadcastRoomUpdate(io, room)
  room.engine.start()
}

// Auto-start trigger: once everyone is ready and at least one category is chosen
// overall, build the engine and launch. No-op otherwise.
function maybeAutoStart(io, room) {
  if (roomManager.getMatchCanStart(room).canStart) {
    roomManager.beginMatch(room)
    launchMatch(io, room)
  }
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('room:create', (payload = {}) => {
      try {
        const playerName = validatePlayerName(payload.playerName)
        const maxPlayers = validateMaxPlayers(payload.maxPlayers)
        const { room, player } = roomManager.createRoom({
          playerName,
          maxPlayers,
          socketId: socket.id,
        })

        socket.join(room.roomCode)
        socket.emit('room:created', {
          roomCode: room.roomCode,
          playerId: player.playerId,
          reconnectToken: player.reconnectToken,
          room: roomManager.buildRoomSnapshot(room),
        })
        broadcastRoomUpdate(io, room)
      } catch (error) {
        emitSocketError(socket, 'room:error', error.message)
      }
    })

    socket.on('room:join', (payload = {}) => {
      try {
        const roomCode = validateRoomCode(payload.roomCode)
        const playerName = validatePlayerName(payload.playerName)
        const { room, player } = roomManager.joinRoom({
          roomCode,
          playerName,
          socketId: socket.id,
        })

        socket.join(room.roomCode)
        socket.emit('room:joined', {
          playerId: player.playerId,
          reconnectToken: player.reconnectToken,
          room: roomManager.buildRoomSnapshot(room),
        })
        broadcastRoomUpdate(io, room)
      } catch (error) {
        emitSocketError(socket, 'room:error', error.message)
      }
    })

    // Same player returning after a reload / short drop. Reattaches to the existing
    // in-memory session (same team + running engine) via their reconnect token — the
    // match keeps going with scores intact. Reuses the room:joined event so the client
    // restores identity + room exactly as on a normal join.
    socket.on('room:rejoin', (payload = {}) => {
      try {
        const { room, player, hostChanged } = roomManager.reconnectPlayer({
          reconnectToken: payload.reconnectToken,
          socketId: socket.id,
        })

        cancelRemovalTimer(player.playerId)
        socket.join(room.roomCode)
        socket.emit('room:joined', {
          playerId: player.playerId,
          reconnectToken: player.reconnectToken,
          room: roomManager.buildRoomSnapshot(room, player.team),
        })

        // Mid-match: push the current authoritative game state to just this socket so
        // GameScreen renders the live board/question/timer immediately on return.
        if (room.engine) {
          const snapshot = roomManager.buildRoomSnapshot(room, player.team)
          io.to(socket.id).emit('game:snapshot', {
            room: snapshot,
            game: snapshot.game,
          })
        }

        if (hostChanged) {
          broadcastHostChanged(io, room)
        }
        broadcastRoomUpdate(io, room)
      } catch (error) {
        emitSocketError(socket, 'room:error', error.message)
      }
    })

    socket.on('player:ready', () => {
      try {
        const room = roomManager.setPlayerReady(socket.id, true)
        broadcastRoomUpdate(io, room)
        maybeAutoStart(io, room)
      } catch (error) {
        emitSocketError(socket, 'action:error', error.message)
      }
    })

    socket.on('player:unready', () => {
      try {
        const room = roomManager.setPlayerReady(socket.id, false)
        broadcastRoomUpdate(io, room)
      } catch (error) {
        emitSocketError(socket, 'action:error', error.message)
      }
    })

    socket.on('player:setCategories', (payload = {}) => {
      try {
        const room = roomManager.setPlayerCategories(socket.id, validateCategoryIds(payload.categories))
        broadcastRoomUpdate(io, room)
        maybeAutoStart(io, room)
      } catch (error) {
        emitSocketError(socket, 'action:error', error.message)
      }
    })

    socket.on('room:update-settings', (payload = {}) => {
      try {
        const room = roomManager.updateRoomSettings(socket.id, validateRoomSettingsPatch(payload))
        broadcastRoomUpdate(io, room)
      } catch (error) {
        emitSocketError(socket, 'action:error', error.message)
      }
    })

    socket.on('room:set-team', (payload = {}) => {
      try {
        const room = roomManager.setPlayerTeam(socket.id, payload.team)
        broadcastRoomUpdate(io, room)
      } catch (error) {
        emitSocketError(socket, 'action:error', error.message)
      }
    })

    socket.on('match:can-start', () => {
      try {
        const { room } = roomManager.getPlayerContextOrThrow(socket.id)
        const result = roomManager.getMatchCanStart(room)
        socket.emit('match:can-start', result)
      } catch (error) {
        socket.emit('match:can-start', {
          canStart: false,
          reason: error.message,
        })
      }
    })

    socket.on('match:start', () => {
      try {
        const room = roomManager.startMatch(socket.id)
        launchMatch(io, room)
      } catch (error) {
        emitSocketError(socket, 'action:error', error.message)
      }
    })

    // In-game intents — all delegate to the authoritative engine, which broadcasts
    // game:snapshot on every state change (incl. its own question/stage timers).
    socket.on('cell:select', (payload = {}) => {
      try {
        const { room, player } = roomManager.getPlayerContextOrThrow(socket.id)
        if (!room.engine) throw new Error('Game has not started.')
        room.engine.selectCell(player.team, Number(payload.cellIndex), player.playerId)
      } catch (error) {
        emitSocketError(socket, 'action:error', error.message)
      }
    })

    socket.on('ability:activate', (payload = {}) => {
      try {
        const { room, player } = roomManager.getPlayerContextOrThrow(socket.id)
        if (!room.engine) throw new Error('Game has not started.')
        room.engine.activateAbility(player.team, payload.ability, player.playerId)
      } catch (error) {
        emitSocketError(socket, 'action:error', error.message)
      }
    })

    socket.on('answer:select', (payload = {}) => {
      try {
        const { room, player } = roomManager.getPlayerContextOrThrow(socket.id)
        if (!room.engine) throw new Error('Game has not started.')
        room.engine.submitAnswer(player.team, Number(payload.answerIndex), player.playerId)
      } catch (error) {
        emitSocketError(socket, 'action:error', error.message)
      }
    })

    socket.on('room:leave', () => {
      const session = roomManager.getPlayerSession(socket.id)
      const result = roomManager.leavePlayer(socket.id)

      if (session?.roomCode) {
        socket.leave(session.roomCode)
      }

      // Explicit leave = final; drop any grace timer that may be pending for this player.
      if (result?.removedPlayer) {
        cancelRemovalTimer(result.removedPlayer.playerId)
      }

      if (result?.room) {
        if (result.hostChanged) {
          broadcastHostChanged(io, result.room)
        }

        broadcastRoomUpdate(io, result.room)
      }
    })

    socket.on('disconnect', () => {
      const result = roomManager.disconnectPlayer(socket.id)

      if (!result?.room) {
        return
      }

      if (result.hostChanged) {
        broadcastHostChanged(io, result.room)
      }
      broadcastRoomUpdate(io, result.room)

      // Don't remove the player yet — give them a grace window to reconnect (reload).
      // If they don't return, finalizeDisconnect() removes them and forfeits if needed.
      const { roomCode } = result.room
      const { playerId } = result.removedPlayer
      cancelRemovalTimer(playerId)
      removalTimers.set(
        playerId,
        setTimeout(() => {
          removalTimers.delete(playerId)
          const finalized = roomManager.finalizeDisconnect(roomCode, playerId)
          if (finalized?.room) {
            if (finalized.hostChanged) {
              broadcastHostChanged(io, finalized.room)
            }
            broadcastRoomUpdate(io, finalized.room)
          }
        }, RECONNECT_GRACE_MS),
      )
    })
  })
}