import { MAX_ROOM_PLAYERS, MIN_ROOM_PLAYERS } from '../constants/roomConstants.js'
import { MAX_STAGES } from '../../../src/game/constants/gameConstants.js'
import { CATEGORY_IDS } from '../../../src/game/data/questions/index.js'

const VALID_CATEGORY_IDS = new Set(CATEGORY_IDS)

function normalizePlayerName(playerName) {
  return typeof playerName === 'string' ? playerName.trim() : ''
}

export function validatePlayerName(playerName) {
  const normalizedName = normalizePlayerName(playerName)

  if (!normalizedName) {
    throw new Error('Player name is required.')
  }

  if (normalizedName.length > 24) {
    throw new Error('Player name must be 24 characters or fewer.')
  }

  return normalizedName
}

export function validateMaxPlayers(maxPlayers) {
  if (!Number.isInteger(maxPlayers) || maxPlayers < MIN_ROOM_PLAYERS || maxPlayers > MAX_ROOM_PLAYERS) {
    throw new Error(`Max players must be an integer between ${MIN_ROOM_PLAYERS} and ${MAX_ROOM_PLAYERS}.`)
  }

  return maxPlayers
}

export function validateTimerDuration(timerDuration) {
  if (!Number.isInteger(timerDuration) || timerDuration < 5 || timerDuration > 120) {
    throw new Error('Timer duration must be an integer between 5 and 120.')
  }

  return timerDuration
}

export function validateStageCount(stageCount) {
  if (!Number.isInteger(stageCount) || stageCount < 1 || stageCount > MAX_STAGES) {
    throw new Error(`Rounds must be an integer between 1 and ${MAX_STAGES}.`)
  }

  return stageCount
}

export function validateQuestionCategory(questionCategory) {
  if (questionCategory === null || questionCategory === undefined) {
    return null
  }

  if (typeof questionCategory !== 'string') {
    throw new Error('Question category must be a string or null.')
  }

  const normalizedCategory = questionCategory.trim()

  if (!normalizedCategory) {
    return null
  }

  if (normalizedCategory.length > 40) {
    throw new Error('Question category must be 40 characters or fewer.')
  }

  return normalizedCategory
}

export function validateCategoryIds(categories) {
  if (!Array.isArray(categories)) {
    throw new Error('Categories must be an array.')
  }

  const normalized = []
  const seen = new Set()

  for (const id of categories) {
    if (typeof id !== 'string') {
      throw new Error('Category ids must be strings.')
    }

    // Silently drop unknown ids and duplicates so a stale client can't wedge the room.
    if (VALID_CATEGORY_IDS.has(id) && !seen.has(id)) {
      seen.add(id)
      normalized.push(id)
    }
  }

  return normalized
}

function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

export function validateTeamColors(teamColors) {
  if (teamColors === null || teamColors === undefined) {
    return undefined
  }

  if (typeof teamColors !== 'object') {
    throw new Error('Team colors must be an object.')
  }

  const result = {}

  for (const key of ['X', 'O']) {
    if (teamColors[key] !== undefined) {
      if (!isHexColor(teamColors[key])) {
        throw new Error('Team colors must be #rrggbb hex values.')
      }

      result[key] = teamColors[key].toLowerCase()
    }
  }

  return Object.keys(result).length > 0 ? result : undefined
}

export function validateRoomSettingsPatch(patch = {}) {
  const validatedPatch = {}

  if (patch.maxPlayers !== undefined) {
    validatedPatch.maxPlayers = validateMaxPlayers(patch.maxPlayers)
  }

  if (patch.teamColors !== undefined) {
    const colors = validateTeamColors(patch.teamColors)
    if (colors) {
      validatedPatch.teamColors = colors
    }
  }

  if (patch.timerDuration !== undefined) {
    validatedPatch.timerDuration = validateTimerDuration(patch.timerDuration)
  }

  if (patch.stageCount !== undefined) {
    validatedPatch.stageCount = validateStageCount(patch.stageCount)
  }

  if (patch.questionCategory !== undefined) {
    validatedPatch.questionCategory = validateQuestionCategory(patch.questionCategory)
  }

  return validatedPatch
}

export function validateRoomCode(roomCode) {
  const normalizedRoomCode = typeof roomCode === 'string' ? roomCode.trim().toUpperCase() : ''

  if (!normalizedRoomCode) {
    throw new Error('Room code is required.')
  }

  return normalizedRoomCode
}
