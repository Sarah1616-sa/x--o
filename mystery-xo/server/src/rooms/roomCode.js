import { randomInt } from 'node:crypto'

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_CODE_LENGTH = 6

export function generateRoomCode(existingCodes = new Set()) {
  let roomCode = ''

  do {
    roomCode = Array.from({ length: ROOM_CODE_LENGTH }, () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]).join('')
  } while (existingCodes.has(roomCode))

  return roomCode
}
