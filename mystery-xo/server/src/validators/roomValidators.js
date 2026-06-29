import { ALLOWED_MAX_PLAYERS } from '../constants/roomConstants.js'

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
  if (!ALLOWED_MAX_PLAYERS.includes(maxPlayers)) {
    throw new Error(`Max players must be one of: ${ALLOWED_MAX_PLAYERS.join(', ')}`)
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
  if (!Number.isInteger(stageCount) || stageCount < 1 || stageCount > 20) {
    throw new Error('Stage count must be an integer between 1 and 20.')
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

export function validateRoomSettingsPatch(patch = {}) {
  const validatedPatch = {}

  if (patch.maxPlayers !== undefined) {
    validatedPatch.maxPlayers = validateMaxPlayers(patch.maxPlayers)
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
