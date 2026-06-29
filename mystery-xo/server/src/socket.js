import { roomManager } from './rooms/roomManager.js'
import { validateMaxPlayers, validatePlayerName, validateRoomCode, validateRoomSettingsPatch } from './validators/roomValidators.js'

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

    socket.on('player:ready', () => {
      try {
        const room = roomManager.setPlayerReady(socket.id, true)
        broadcastRoomUpdate(io, room)
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

    socket.on('room:update-settings', (payload = {}) => {
      try {
        const room = roomManager.updateRoomSettings(socket.id, validateRoomSettingsPatch(payload))
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
        io.to(room.roomCode).emit('match:starting', {
          phase: room.phase,
          room: roomManager.buildRoomSnapshot(room),
        })
        broadcastRoomUpdate(io, room)
      } catch (error) {
        emitSocketError(socket, 'action:error', error.message)
      }
    })

    socket.on('cell:select', (payload = {}) => {
      try {
        const { room, outcome } = roomManager.selectCell(socket.id, Number(payload.cellIndex))
        const snapshot = roomManager.buildRoomSnapshot(room)

        io.to(room.roomCode).emit('game:snapshot', {
          room: snapshot,
          game: snapshot.game,
        })

        io.to(room.roomCode).emit('board:update', {
          board: snapshot.game.board,
          currentTurnTeam: snapshot.game.currentTurnTeam,
          room: snapshot,
          game: snapshot.game,
        })

        if (outcome.type === 'STAGE_END') {
          io.to(room.roomCode).emit('stage:end', {
            winner: outcome.winner,
            room: snapshot,
            game: snapshot.game,
          })

          setTimeout(() => {
            const nextRoom = roomManager.advanceToNextStage(room.roomCode)
            const nextSnapshot = roomManager.buildRoomSnapshot(nextRoom)

            io.to(nextRoom.roomCode).emit('game:snapshot', {
              room: nextSnapshot,
              game: nextSnapshot.game,
            })

            io.to(nextRoom.roomCode).emit('turn:started', {
              currentTurnTeam: nextSnapshot.game.currentTurnTeam,
              room: nextSnapshot,
              game: nextSnapshot.game,
            })
          }, 1500)
        }

        if (outcome.type === 'MATCH_END') {
          io.to(room.roomCode).emit('match:end', {
            winner: outcome.winner,
            room: snapshot,
            game: snapshot.game,
          })
        }

        if (outcome.type === 'TURN_SWITCHED') {
          io.to(room.roomCode).emit('turn:started', {
            currentTurnTeam: snapshot.game.currentTurnTeam,
            room: snapshot,
            game: snapshot.game,
          })
        }
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

      if (result?.room) {
        if (result.hostChanged) {
          broadcastHostChanged(io, result.room)
        }

        broadcastRoomUpdate(io, result.room)
      }
    })

    socket.on('disconnect', () => {
      const result = roomManager.disconnectPlayer(socket.id)

      if (result?.room) {
        if (result.hostChanged) {
          broadcastHostChanged(io, result.room)
        }

        broadcastRoomUpdate(io, result.room)
      }
    })
  })
}