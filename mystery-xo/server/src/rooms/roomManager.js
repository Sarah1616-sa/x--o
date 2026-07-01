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
import { GameEngine } from '../game/GameEngine.js'
import { buildQuestionPool } from '../../../src/game/data/questions/index.js'

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
    selectedCategories: [],
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
    engine: null,
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

    // At least one category must be chosen across all players — the question pool is
    // the union of everyone's picks, so an empty union has nothing to ask.
    if (this.getSelectedCategoryUnion(room).length === 0) {
      return { canStart: false, reason: 'يجب اختيار فئة واحدة على الأقل.' }
    }

    return { canStart: true, reason: 'Match can start.' }
  }

  // Union of every connected player's selected category ids (deduped).
  getSelectedCategoryUnion(room) {
    const ids = new Set()
    for (const player of this.getConnectedPlayers(room)) {
      for (const id of player.selectedCategories) {
        ids.add(id)
      }
    }
    return [...ids]
  }

  // Host-triggered manual start (kept as a fallback). The lobby now auto-starts via
  // beginMatch() once everyone is ready, so the client no longer calls this.
  startMatch(socketId) {
    const { room, player } = this.getPlayerContextOrThrow(socketId)

    if (room.hostPlayerId !== player.playerId) {
      throw new Error('Only the host can start the match.')
    }

    return this.beginMatch(room)
  }

  // Builds the authoritative engine and flips the room into play. No host check —
  // the "all players ready + at least one category chosen" gate is the trigger.
  beginMatch(room) {
    if (room.phase !== ROOM_PHASES.LOBBY) {
      throw new Error('Match has already started.')
    }

    const startState = this.getMatchCanStart(room)

    if (!startState.canStart) {
      throw new Error(startState.reason)
    }

    // Roster in turn order — each entry carries the player's own selected
    // categories so the engine can draw that answerer's question from THEIR cats.
    const rosterFor = (team) =>
      room.teams[team].playerIds
        .map((id) => room.players[id])
        .filter(Boolean)
        .map((p) => ({ name: p.name, categories: [...p.selectedCategories] }))
    const rosters = { X: rosterFor('X'), O: rosterFor('O') }

    // The question pool is the union of every player's selected categories (falls
    // back to all questions if somehow empty — getMatchCanStart already guards this).
    const questionBank = buildQuestionPool(this.getSelectedCategoryUnion(room))

    // Authoritative game engine — runs the full game (questions/abilities/turns)
    // over the SAME pure systems the client uses. emit() is wired by socket.js.
    // teamSizes is derived from the same filtered roster so answerer rotation and
    // the displayed answerer name stay in lockstep.
    room.engine = new GameEngine({
      maxStages: room.settings.stageCount,
      teamSizes: { X: rosters.X.length || 1, O: rosters.O.length || 1 },
      teamRosters: rosters,
      questionBank,
    })
    room.phase = ROOM_PHASES.TURN_IDLE
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

  setPlayerCategories(socketId, categoryIds) {
    const { room, player } = this.getPlayerContextOrThrow(socketId)

    if (room.phase !== ROOM_PHASES.LOBBY) {
      throw new Error('Categories can only change in the lobby.')
    }

    player.selectedCategories = categoryIds
    player.lastSeenAt = Date.now()
    room.updatedAt = Date.now()
    return room
  }

  // A socket dropped (reload, tab close, network blip). We DON'T remove the player or
  // touch the engine here — that would end an in-progress match on every reload. We only
  // flag them offline and keep their reconnect token valid. socket.js starts a grace
  // timer; either reconnectPlayer() cancels it, or finalizeDisconnect() removes them.
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

    // Stale socket: a newer socket already reclaimed this player (reconnect raced ahead
    // of this old socket's disconnect). Drop only the stale session; leave state intact.
    if (player.socketId && player.socketId !== socketId) {
      return null
    }

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

  // Reattach a returning player (same reconnect token) to their existing in-memory
  // session — same playerId, team, and running engine, so scores/board are intact.
  reconnectPlayer({ reconnectToken, socketId }) {
    const ref = this.reconnectTokens.get(reconnectToken)

    if (!ref) {
      throw new Error('Session expired.')
    }

    const room = this.rooms.get(ref.roomCode)

    if (!room) {
      this.reconnectTokens.delete(reconnectToken)
      throw new Error('Session expired.')
    }

    const player = room.players[ref.playerId]

    if (!player) {
      this.reconnectTokens.delete(reconnectToken)
      throw new Error('Session expired.')
    }

    player.connected = true
    player.socketId = socketId
    player.lastSeenAt = Date.now()
    room.updatedAt = Date.now()
    this.attachSocketSession(socketId, room.roomCode, player.playerId)

    const hostChanged = this.reassignHostIfNeeded(room)

    return {
      room,
      player,
      hostChanged,
    }
  }

  // Grace window expired with no reconnect → actually remove the player. This is where
  // the deferred forfeit / room teardown happens (moved out of disconnectPlayer).
  finalizeDisconnect(roomCode, playerId) {
    const room = this.rooms.get(roomCode)

    if (!room) {
      return null
    }

    const player = room.players[playerId]

    // Gone already, or they reconnected inside the grace window → nothing to do.
    if (!player || player.connected) {
      return null
    }

    this.reconnectTokens.delete(player.reconnectToken)
    this.removePlayerFromRoom(room, playerId)
    room.updatedAt = Date.now()

    this.forfeitIfTeamEmpty(room)

    // Room fully abandoned → tear down the engine (stops its timers) and delete it.
    if (this.getRoomPlayerCount(room) === 0) {
      room.engine?.destroy()
      room.engine = null
      this.clearRoomReconnectTokens(room)
      this.rooms.delete(room.roomCode)
      return {
        room: null,
        destroyed: true,
        removedPlayer: player,
        hostChanged: false,
      }
    }

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

    this.forfeitIfTeamEmpty(room)

    if (this.getRoomPlayerCount(room) === 0) {
      room.engine?.destroy()
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

  buildRoomSnapshot(room, viewerTeam = null) {
    const players = Object.fromEntries(
      Object.values(room.players).map((player) => [
        player.playerId,
        {
          playerId: player.playerId,
          name: player.name,
          team: player.team,
          role: player.role,
          ready: player.ready,
          selectedCategories: [...player.selectedCategories],
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
      // authoritative game state from the engine (null until the match starts).
      // viewerTeam scopes it so the trap stays hidden from the enemy team.
      game: room.engine ? room.engine.snapshot(viewerTeam) : null,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    }
  }

  getConnectedPlayers(room) {
    return Object.values(room.players).filter((player) => player.connected)
  }

  // A live match with one side emptied (by removal or a grace-expired drop) can't be won —
  // end it for the other team. emit() is already wired, so forfeit broadcasts MATCH_END to
  // the survivors. Shared by finalizeDisconnect (timed-out drop) and leavePlayer (مغادرة).
  forfeitIfTeamEmpty(room) {
    if (!room.engine || room.engine.isMatchOver()) {
      return
    }

    const connected = this.getConnectedPlayers(room)
    const connX = connected.filter((player) => player.team === 'X').length
    const connO = connected.filter((player) => player.team === 'O').length

    if (connX === 0 && connO > 0) {
      room.engine.forfeit('O')
    } else if (connO === 0 && connX > 0) {
      room.engine.forfeit('X')
    }
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
}

export const roomManager = new RoomManager()
