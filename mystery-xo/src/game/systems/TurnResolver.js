export class TurnResolver {
  constructor({ abilitySystem, matchSystem, winningLines }) {
    this.abilitySystem = abilitySystem
    this.matchSystem = matchSystem
    this.winningLines = winningLines
  }

 handleCellClick({
  index,
  board,
  currentPlayer,
  playerTeam,
  matchComplete,
  stageLocked,
  questionOpen,
}) {
  if (matchComplete || stageLocked || questionOpen) {
    return null
  }

  // Multiplayer protection:
  // This device can only act when its assigned team matches the active turn.
  if (playerTeam && playerTeam !== currentPlayer) {
    return {
      type: 'NOT_YOUR_TURN',
      currentTurnTeam: currentPlayer,
      playerTeam,
    }
  }

  if (this.abilitySystem.stealArmedTeam === currentPlayer) {
    return this.resolveSteal({ index, board, currentPlayer })
  }

  if (this.abilitySystem.shieldArmedTeam === currentPlayer) {
    return this.resolveShield({ index, board, currentPlayer })
  }

  if (this.abilitySystem.trapArmedTeam === currentPlayer) {
    return this.resolveTrapPlacement({ index, board })
  }

  if (!this.isSquareEmpty(board, index)) {
    return null
  }

  if (this.abilitySystem.powerArmedTeam === currentPlayer) {
    return {
      type: 'POWER_CLAIM',
      cellIndex: index,
      team: currentPlayer,
    }
  }

  return {
    type: 'OPEN_QUESTION',
    cellIndex: index,
  }
}

  resolvePendingCell({ board, pendingCellIndex, currentPlayer }) {
    if (pendingCellIndex === null) {
      return null
    }

    const trapOwner = this.abilitySystem.trapSquares.get(pendingCellIndex)

    if (trapOwner && trapOwner !== currentPlayer && this.abilitySystem.canFutureAbilityModifySquare(pendingCellIndex)) {
      return {
        type: 'TRAP_TRIGGER',
        cellIndex: pendingCellIndex,
        team: trapOwner,
      }
    }

    return {
      type: 'CLAIM_CELL',
      cellIndex: pendingCellIndex,
      team: currentPlayer,
    }
  }

  resolveIncorrectAnswer() {
    return this.createSwitchTurnResult('INCORRECT_ANSWER')
  }

  resolveQuestionTimeout() {
    return this.createSwitchTurnResult('QUESTION_TIMEOUT')
  }

  resolveSteal({ index, board, currentPlayer }) {
    if (!this.isSquareOwnedByOpponent(board, index, currentPlayer) || !this.abilitySystem.canFutureAbilityModifySquare(index)) {
      return {
        type: 'INVALID_TARGET',
        message: 'INVALID_STEAL_TARGET',
      }
    }

    return {
      type: 'APPLY_STEAL',
      cellIndex: index,
      team: currentPlayer,
    }
  }

  resolveShield({ index, board, currentPlayer }) {
    if (!this.isSquareOwnedByCurrentTeam(board, index, currentPlayer) || this.abilitySystem.isSquareProtected(index)) {
      return {
        type: 'INVALID_TARGET',
        message: 'INVALID_SHIELD_TARGET',
      }
    }

    return {
      type: 'APPLY_SHIELD',
      cellIndex: index,
      team: currentPlayer,
    }
  }

  resolveTrapPlacement({ index, board }) {
    if (!this.isSquareEmpty(board, index) || this.abilitySystem.trapSquares.has(index)) {
      return {
        type: 'INVALID_TARGET',
        message: 'INVALID_TRAP_TARGET',
      }
    }

    return {
      type: 'PLACE_TRAP',
      cellIndex: index,
    }
  }

  resolveBoardOutcome(board, team) {
    if (this.matchSystem.getStageWinner(board, this.winningLines, team)) {
      return {
        type: 'STAGE_WIN',
        team,
      }
    }

    if (this.matchSystem.isBoardFull(board) && !this.matchSystem.hasAnyStageWinner(board, this.winningLines)) {
      return {
        type: 'STAGE_DRAW',
      }
    }

    return this.createSwitchTurnResult('MOVE_COMPLETE')
  }

  createSwitchTurnResult(reason) {
    return {
      type: 'SWITCH_TURN',
      reason,
    }
  }

  isSquareEmpty(board, index) {
    const row = Math.floor(index / 3)
    const column = index % 3

    return board[row][column] === null
  }

  isSquareOwnedByCurrentTeam(board, index, currentPlayer) {
    const row = Math.floor(index / 3)
    const column = index % 3

    return board[row][column] === currentPlayer
  }

  isSquareOwnedByOpponent(board, index, currentPlayer) {
    const row = Math.floor(index / 3)
    const column = index % 3
    const owner = board[row][column]

    return owner !== null && owner !== currentPlayer
  }
}
