export class TurnResolver {
  constructor({ abilitySystem, matchSystem, winningLines }) {
    this.abilitySystem = abilitySystem
    this.matchSystem = matchSystem
    this.winningLines = winningLines
  }

  handleCellClick({ index, board, currentPlayer, matchComplete, stageLocked, questionOpen }) {
    if (matchComplete || stageLocked || questionOpen) {
      return null
    }

    if (this.abilitySystem.stealArmedTeam === currentPlayer) {
      return this.resolveSteal({ index, board, currentPlayer })
    }

    if (this.abilitySystem.shieldArmedTeam === currentPlayer) {
      return this.resolveShield({ index, board, currentPlayer })
    }

    if (this.abilitySystem.trapArmedTeam === currentPlayer) {
      return this.resolveTrapPlacement({ index, board, currentPlayer })
    }

    if (!this.isSquareEmpty(board, index)) {
      return null
    }

    if (this.abilitySystem.powerArmedTeam === currentPlayer) {
      return this.resolveClaim({
        type: 'POWER_CLAIM',
        board,
        cellIndex: index,
        team: currentPlayer,
      })
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

    const trapResolution = this.abilitySystem.resolveTrapForPendingCell(pendingCellIndex, currentPlayer)

    if (trapResolution.triggered) {
      return this.resolveClaim({
        type: 'TRAP_TRIGGER',
        board,
        cellIndex: pendingCellIndex,
        team: trapResolution.trapOwner,
      })
    }

    return this.resolveClaim({
      type: 'CLAIM_CELL',
      board,
      cellIndex: pendingCellIndex,
      team: currentPlayer,
    })
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

    this.abilitySystem.consumeSteal(currentPlayer, index)

    return this.resolveClaim({
      type: 'STEAL_APPLIED',
      board,
      cellIndex: index,
      team: currentPlayer,
    })
  }

  resolveShield({ index, board, currentPlayer }) {
    if (!this.isSquareOwnedByCurrentTeam(board, index, currentPlayer) || this.abilitySystem.isSquareProtected(index)) {
      return {
        type: 'INVALID_TARGET',
        message: 'INVALID_SHIELD_TARGET',
      }
    }

    this.abilitySystem.consumeShield(currentPlayer, index)

    return {
      type: 'SHIELD_APPLIED',
      cellIndex: index,
      team: currentPlayer,
      followUp: this.createSwitchTurnResult('SHIELD_APPLIED'),
    }
  }

  resolveTrapPlacement({ index, board, currentPlayer }) {
    if (!this.isSquareEmpty(board, index) || this.abilitySystem.trapSquares.has(index)) {
      return {
        type: 'INVALID_TARGET',
        message: 'INVALID_TRAP_TARGET',
      }
    }

    this.abilitySystem.consumeTrapPlacement(currentPlayer, index)

    return {
      type: 'TRAP_PLACED',
      cellIndex: index,
      team: currentPlayer,
      followUp: this.createSwitchTurnResult('TRAP_PLACED'),
    }
  }

  resolveClaim({ type, board, cellIndex, team }) {
    this.setSquareOwner(board, cellIndex, team)

    if (type === 'CLAIM_CELL' || type === 'POWER_CLAIM') {
      this.abilitySystem.consumeClaimAt(cellIndex)
    }

    return {
      type,
      cellIndex,
      team,
      followUp: this.resolveBoardOutcome(board, team),
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

  setSquareOwner(board, index, team) {
    const row = Math.floor(index / 3)
    const column = index % 3

    board[row][column] = team
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
