import { randomBytes, randomUUID } from 'node:crypto'
import {
  DEFAULT_QUESTION_CATEGORY,
  DEFAULT_STAGE_COUNT,
  DEFAULT_TEAM_COLORS,
  DEFAULT_TIMER_DURATION,
  PLAYER_ROLES,
  ROOM_PHASES,
} from '../constants/roomConstants.js'
import { generateRoomCode } from './roomCode.js'

function createReconnectToken() {
  return randomBytes(24).toString('hex')
}

function createDefaultSettings(maxPlayers) {
  return {
    maxPlayers,
    timerDuration: DEFAULT_TIMER_DURATION,
    stageCount: DEFAULT_STAGE_COUNT,
    questionCategory: DEFAULT_QUESTION_CATEGORY,
    teamColors: { ...DEFAULT_TEAM_COLORS },
  }
}

function createTeamState() {
  return {
    playerIds: [],
  }
}

function getPlayerRole(teamSize) {
  if (teamSize === 0) {
    return PLAYER_ROLES.CAPTAIN
  }

  if (teamSize === 1) {
    return PLAYER_ROLES.PARTNER
  }

  return PLAYER_ROLES.MEMBER
}

function getBalancedTeam(room) {
  const xCount = room.teams.X.playerIds.length
  const oCount = room.teams.O.playerIds.length

  return xCount <= oCount ? 'X' : 'O'
}

function createPlayer({ playerName, socketId, team, teamSize, isHost = false }) {
  return {
    playerId: randomUUID(),
    socketId,
    reconnectToken: createReconnectToken(),
    name: playerName,
    team,
    role: getPlayerRole(teamSize),
    ready: false,
    connected: true,
    isHost,
    joinedAt: Date.now(),
    lastSeenAt: Date.now(),
  }
}

function createRoom({ roomCode, maxPlayers, hostPlayer }) {
  return {
    roomId: randomUUID(),
    roomCode,
    hostPlayerId: hostPlayer.playerId,
    phase: ROOM_PHASES.LOBBY,
    settings: createDefaultSettings(maxPlayers),
    players: {
      [hostPlayer.playerId]: hostPlayer,
    },
    teams: {
      X: createTeamState(),
      O: createTeamState(),
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export class RoomManager {
  constructor() {
    this.rooms = new Map()
    this.playerSessions = new Map()
    this.reconnectTokens = new Map()
  }

  createRoom({ playerName, maxPlayers, socketId }) {
    const roomCode = generateRoomCode(new Set(this.rooms.keys()))
    const hostPlayer = createPlayer({
      playerName,
      socketId,
      team: 'X',
      teamSize: 0,
      isHost: true,
    })
    const room = createRoom({
      roomCode,
      maxPlayers,
      hostPlayer,
    })

    room.teams.X.playerIds.push(hostPlayer.playerId)
    this.rooms.set(roomCode, room)
    this.attachSocketSession(socketId, roomCode, hostPlayer.playerId)
    this.reconnectTokens.set(hostPlayer.reconnectToken, {
      roomCode,
      playerId: hostPlayer.playerId,
    })

    return {
      room,
      player: hostPlayer,
    }
  }

  joinRoom({ roomCode, playerName, socketId }) {
    const room = this.getRoomOrThrow(roomCode)

    if (room.phase !== ROOM_PHASES.LOBBY) {
      throw new Error('Room is not accepting new players.')
    }

    if (this.getRoomPlayerCount(room) >= room.settings.maxPlayers) {
      throw new Error('Room is full.')
    }

    const team = getBalancedTeam(room)
    const teamSize = room.teams[team].playerIds.length
    const player = createPlayer({
      playerName,
      socketId,
      team,
      teamSize,
    })

    room.players[player.playerId] = player
    room.teams[team].playerIds.push(player.playerId)
    room.updatedAt = Date.now()
    this.attachSocketSession(socketId, roomCode, player.playerId)
    this.reconnectTokens.set(player.reconnectToken, {
      roomCode,
      playerId: player.playerId,
    })

    return {
      room,
      player,
    }
  }

  updateRoomSettings(socketId, nextSettings) {
    const { room, player } = this.getPlayerContextOrThrow(socketId)

    if (room.phase !== ROOM_PHASES.LOBBY) {
      throw new Error('Room settings cannot be changed after the match starts.')
    }

    if (room.hostPlayerId !== player.playerId) {
      throw new Error('Only the host can update room settings.')
    }

    if (nextSettings.maxPlayers !== undefined) {
      if (this.getRoomPlayerCount(room) > nextSettings.maxPlayers) {
        throw new Error('Max players cannot be lower than the current number of players.')
      }

      room.settings.maxPlayers = nextSettings.maxPlayers
    }

    if (nextSettings.timerDuration !== undefined) {
      room.settings.timerDuration = nextSettings.timerDuration
    }

    if (nextSettings.stageCount !== undefined) {
      room.settings.stageCount = nextSettings.stageCount
    }

    if (nextSettings.questionCategory !== undefined) {
      room.settings.questionCategory = nextSettings.questionCategory
    }

    if (nextSettings.teamColors !== undefined) {
      room.settings.teamColors = {
        ...room.settings.teamColors,
        ...nextSettings.teamColors,
      }
    }

    room.updatedAt = Date.now()
    return room
  }

  setPlayerTeam(socketId, team) {
    const { room, player } = this.getPlayerContextOrThrow(socketId)

    if (room.phase !== ROOM_PHASES.LOBBY) {
      throw new Error('Teams can only change in the lobby.')
    }

    if (team !== 'X' && team !== 'O') {
      throw new Error('Invalid team.')
    }

    if (player.team === team) {
      return room
    }

    room.teams[player.team].playerIds = room.teams[player.team].playerIds.filter((id) => id !== player.playerId)
    player.team = team
    player.role = getPlayerRole(room.teams[team].playerIds.length)
    player.ready = false
    room.teams[team].playerIds.push(player.playerId)
    room.updatedAt = Date.now()
    return room
  }

  getMatchCanStart(room) {
    const connectedPlayers = this.getConnectedPlayers(room)

    if (room.phase !== ROOM_PHASES.LOBBY) {
      return { canStart: false, reason: 'Match has already started.' }
    }

    if (connectedPlayers.length < 2) {
      return { canStart: false, reason: 'Room must have at least 2 connected players.' }
    }

    const connectedX = connectedPlayers.filter((player) => player.team === 'X').length
    const connectedO = connectedPlayers.filter((player) => player.team === 'O').length

    // Teams may be uneven and the total may be odd — only require both sides exist.
    if (connectedX < 1 || connectedO < 1) {
      return { canStart: false, reason: 'Each team needs at least one connected player.' }
    }

    if (connectedPlayers.some((player) => !player.ready)) {
      return { canStart: false, reason: 'Every connected player must be ready.' }
    }

    return { canStart: true, reason: 'Match can start.' }
  }

  startMatch(socketId) {
    
    const { room, player } = this.getPlayerContextOrThrow(socketId)

    if (room.hostPlayerId !== player.playerId) {
      throw new Error('Only the host can start the match.')
    }

    if (room.phase !== ROOM_PHASES.LOBBY) {
      throw new Error('Match has already started.')
    }

    const startState = this.getMatchCanStart(room)

    if (!startState.canStart) {
      throw new Error(startState.reason)
    }

    room.phase = ROOM_PHASES.ANSWERER_SELECTION
    room.updatedAt = Date.now()
    return room
  }

  setPlayerReady(socketId, ready) {
    const { room, player } = this.getPlayerContextOrThrow(socketId)
    player.ready = ready
    player.lastSeenAt = Date.now()
    room.updatedAt = Date.now()
    return room
  }

  disconnectPlayer(socketId) {
    const session = this.playerSessions.get(socketId)

    if (!session) {
      return null
    }

    const room = this.rooms.get(session.roomCode)

    if (!room) {
      this.playerSessions.delete(socketId)
      return null
    }

    const player = room.players[session.playerId]

    if (!player) {
      this.playerSessions.delete(socketId)
      return null
    }

    this.playerSessions.delete(socketId)
    player.connected = false
    player.ready = false
    player.lastSeenAt = Date.now()
    player.socketId = null
    room.updatedAt = Date.now()

    const hostChanged = this.reassignHostIfNeeded(room)

    return {
      room,
      destroyed: false,
      removedPlayer: player,
      hostChanged,
    }
  }

  leavePlayer(socketId) {
    const session = this.playerSessions.get(socketId)

    if (!session) {
      return null
    }

    const room = this.rooms.get(session.roomCode)

    if (!room) {
      this.playerSessions.delete(socketId)
      return null
    }

    const player = room.players[session.playerId]

    if (!player) {
      this.playerSessions.delete(socketId)
      return null
    }

    this.playerSessions.delete(socketId)
    this.reconnectTokens.delete(player.reconnectToken)
    this.removePlayerFromRoom(room, player.playerId)

    if (this.getRoomPlayerCount(room) === 0) {
      this.clearRoomReconnectTokens(room)
      this.rooms.delete(room.roomCode)
      return {
        room: null,
        destroyed: true,
        removedPlayer: player,
        hostChanged: false,
      }
    }

    room.updatedAt = Date.now()
    const hostChanged = this.reassignHostIfNeeded(room)

    return {
      room,
      destroyed: false,
      removedPlayer: player,
      hostChanged,
    }
  }

  getPlayerSession(socketId) {
    return this.playerSessions.get(socketId) ?? null
  }

  getRoomSnapshot(roomCode) {
    const room = this.getRoomOrThrow(roomCode)
    return this.buildRoomSnapshot(room)
  }

  buildRoomSnapshot(room) {
    const players = Object.fromEntries(
      Object.values(room.players).map((player) => [
        player.playerId,
        {
          playerId: player.playerId,
          name: player.name,
          team: player.team,
          role: player.role,
          ready: player.ready,
          connected: player.connected,
          isHost: player.isHost,
          joinedAt: player.joinedAt,
          lastSeenAt: player.lastSeenAt,
        },
      ]),
    )

    return {
      roomId: room.roomId,
      roomCode: room.roomCode,
      hostPlayerId: room.hostPlayerId,
      hostPlayerName: room.players[room.hostPlayerId]?.name ?? null,
      phase: room.phase,
      settings: {
        ...room.settings,
      },
      players,
      teams: {
        X: {
          playerIds: [...room.teams.X.playerIds],
        },
        O: {
          playerIds: [...room.teams.O.playerIds],
        },
      },
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    }
  }

  getConnectedPlayers(room) {
    return Object.values(room.players).filter((player) => player.connected)
  }

  getOldestConnectedPlayer(room) {
    const connectedPlayers = this.getConnectedPlayers(room)

    if (connectedPlayers.length === 0) {
      return null
    }

    return [...connectedPlayers].sort((left, right) => left.joinedAt - right.joinedAt)[0]
  }

  reassignHostIfNeeded(room) {
    const currentHost = room.players[room.hostPlayerId]

    if (currentHost?.connected) {
      Object.values(room.players).forEach((player) => {
        player.isHost = player.playerId === currentHost.playerId
      })
      return false
    }

    const nextHost = this.getOldestConnectedPlayer(room)

    if (!nextHost) {
      room.hostPlayerId = null
      Object.values(room.players).forEach((player) => {
        player.isHost = false
      })
      room.updatedAt = Date.now()
      return false
    }

    Object.values(room.players).forEach((player) => {
      player.isHost = player.playerId === nextHost.playerId
    })

    room.hostPlayerId = nextHost.playerId
    room.updatedAt = Date.now()
    return true
  }

  removePlayerFromRoom(room, playerId) {
    const player = room.players[playerId]

    if (!player) {
      return null
    }

    room.teams[player.team].playerIds = room.teams[player.team].playerIds.filter((id) => id !== playerId)
    delete room.players[playerId]
    return player
  }

  clearRoomReconnectTokens(room) {
    Object.values(room.players).forEach((player) => {
      this.reconnectTokens.delete(player.reconnectToken)
    })
  }

  attachSocketSession(socketId, roomCode, playerId) {
    this.playerSessions.set(socketId, {
      roomCode,
      playerId,
    })
  }

  getRoomOrThrow(roomCode) {
    const room = this.rooms.get(roomCode)

    if (!room) {
      throw new Error('Room not found.')
    }

    return room
  }

  getPlayerContextOrThrow(socketId) {
    const session = this.playerSessions.get(socketId)

    if (!session) {
      throw new Error('Player session not found.')
    }

    const room = this.getRoomOrThrow(session.roomCode)
    const player = room.players[session.playerId]

    if (!player) {
      throw new Error('Player not found in room.')
    }

    return {
      room,
      player,
    }
  }

  getRoomPlayerCount(room) {
    return Object.keys(room.players).length
  }
  createInitialGameState(room) {
  return {
    board: Array(9).fill(null),
    currentTurnTeam: 'X',
    currentStage: 1,
    maxStages: room.settings.stageCount,
    stageScores: { X: 0, O: 0 },
    stageLocked: false,
    matchComplete: false,
  }
}

getWinningTeam(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ]

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }

  return null
}

isBoardFull(board) {
  return board.every(Boolean)
}

selectCell(socketId, cellIndex) {
  const { room, player } = this.getPlayerContextOrThrow(socketId)

  if (room.phase !== ROOM_PHASES.TURN_IDLE) {
    throw new Error('It is not time to select a cell.')
  }

  if (!room.game) {
    throw new Error('Game has not started.')
  }

  if (room.game.stageLocked || room.game.matchComplete) {
    throw new Error('Stage or match is locked.')
  }

  if (player.team !== room.game.currentTurnTeam) {
    throw new Error('It is not your team turn.')
  }

  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > 8) {
    throw new Error('Invalid cell index.')
  }

  if (room.game.board[cellIndex]) {
    throw new Error('Cell is already occupied.')
  }

  const team = room.game.currentTurnTeam
  room.game.board[cellIndex] = team

  const winner = this.getWinningTeam(room.game.board)

  if (winner) {
    room.game.stageScores[winner] += 1
    room.game.stageLocked = true

    if (room.game.currentStage >= room.game.maxStages) {
      room.game.matchComplete = true
      room.phase = ROOM_PHASES.MATCH_END
      room.updatedAt = Date.now()
      return { room, outcome: { type: 'MATCH_END', winner } }
    }

    room.phase = ROOM_PHASES.STAGE_END
    room.updatedAt = Date.now()
    return { room, outcome: { type: 'STAGE_END', winner } }
  }

  if (this.isBoardFull(room.game.board)) {
    room.game.stageLocked = true

    if (room.game.currentStage >= room.game.maxStages) {
      room.game.matchComplete = true
      room.phase = ROOM_PHASES.MATCH_END
      room.updatedAt = Date.now()
      return { room, outcome: { type: 'MATCH_END', winner: null } }
    }

    room.phase = ROOM_PHASES.STAGE_END
    room.updatedAt = Date.now()
    return { room, outcome: { type: 'STAGE_END', winner: null } }
  }

  room.game.currentTurnTeam = team === 'X' ? 'O' : 'X'
  room.updatedAt = Date.now()

  return { room, outcome: { type: 'TURN_SWITCHED' } }
}

advanceToNextStage(roomCode) {
  const room = this.getRoomOrThrow(roomCode)

  if (!room.game || room.phase !== ROOM_PHASES.STAGE_END) {
    return room
  }

  room.game.currentStage += 1
  room.game.board = Array(9).fill(null)
  room.game.currentTurnTeam = 'X'
  room.game.stageLocked = false
  room.phase = ROOM_PHASES.TURN_IDLE
  room.updatedAt = Date.now()

  return room
}
}

export const roomManager = new RoomManager()
