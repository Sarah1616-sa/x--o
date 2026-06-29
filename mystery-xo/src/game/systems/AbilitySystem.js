export class AbilitySystem {
  constructor() {
    this.resetMatchState()
  }

  createRemainingState() {
    return {
      X: 1,
      O: 1,
    }
  }

  resetMatchState() {
    this.powerRemaining = this.createRemainingState()
    this.shieldRemaining = this.createRemainingState()
    this.stealRemaining = this.createRemainingState()
    this.trapRemaining = this.createRemainingState()
    this.resetStageState()
  }

  resetStageState() {
    this.powerArmedTeam = null
    this.shieldArmedTeam = null
    this.stealArmedTeam = null
    this.trapArmedTeam = null
    this.protectedSquares = new Set()
    this.trapSquares = new Map()
  }

  clearArmedAbilities() {
    this.powerArmedTeam = null
    this.shieldArmedTeam = null
    this.stealArmedTeam = null
    this.trapArmedTeam = null
  }

  isSquareProtected(index) {
    return this.protectedSquares.has(index)
  }

  canFutureAbilityModifySquare(index) {
    return !this.isSquareProtected(index)
  }

  hasConflictingArmedAbility(currentPlayer) {
    return (
      this.powerArmedTeam === currentPlayer ||
      this.shieldArmedTeam === currentPlayer ||
      this.stealArmedTeam === currentPlayer ||
      this.trapArmedTeam === currentPlayer
    )
  }

  canActivatePower({ currentPlayer, matchComplete, stageLocked, questionOpen }) {
    return !matchComplete && !stageLocked && !questionOpen && this.powerRemaining[currentPlayer] > 0 && !this.hasConflictingArmedAbility(currentPlayer)
  }

  activatePower(currentPlayer) {
    this.powerRemaining[currentPlayer] = 0
    this.powerArmedTeam = currentPlayer
  }

  hasValidShieldTarget(board, currentPlayer) {
    return board.some((row, rowIndex) =>
      row.some((cell, columnIndex) => {
        const index = rowIndex * 3 + columnIndex
        return cell === currentPlayer && !this.isSquareProtected(index)
      }),
    )
  }

  canActivateShield({ board, currentPlayer, matchComplete, stageLocked, questionOpen }) {
    return !matchComplete && !stageLocked && !questionOpen && this.shieldRemaining[currentPlayer] > 0 && !this.hasConflictingArmedAbility(currentPlayer) && this.hasValidShieldTarget(board, currentPlayer)
  }

  activateShield(currentPlayer) {
    this.shieldArmedTeam = currentPlayer
  }

  hasValidStealTarget(board, currentPlayer) {
    return board.some((row, rowIndex) =>
      row.some((cell, columnIndex) => {
        const index = rowIndex * 3 + columnIndex
        return cell !== null && cell !== currentPlayer && this.canFutureAbilityModifySquare(index)
      }),
    )
  }

  canActivateSteal({ board, currentPlayer, matchComplete, stageLocked, questionOpen }) {
    return !matchComplete && !stageLocked && !questionOpen && this.stealRemaining[currentPlayer] > 0 && !this.hasConflictingArmedAbility(currentPlayer) && this.hasValidStealTarget(board, currentPlayer)
  }

  activateSteal(currentPlayer) {
    this.stealArmedTeam = currentPlayer
  }

  hasValidTrapTarget(board) {
    return board.some((row, rowIndex) =>
      row.some((cell, columnIndex) => {
        const index = rowIndex * 3 + columnIndex
        return cell === null && !this.trapSquares.has(index)
      }),
    )
  }

  canActivateTrap({ board, currentPlayer, matchComplete, stageLocked, questionOpen }) {
    return !matchComplete && !stageLocked && !questionOpen && this.trapRemaining[currentPlayer] > 0 && !this.hasConflictingArmedAbility(currentPlayer) && this.hasValidTrapTarget(board)
  }

  activateTrap(currentPlayer) {
    this.trapArmedTeam = currentPlayer
  }

  consumeSteal(currentPlayer, index) {
    this.stealRemaining[currentPlayer] = 0
    this.clearArmedAbilities()
    this.trapSquares.delete(index)
  }

  consumeTrapPlacement(currentPlayer, index) {
    this.trapSquares.set(index, currentPlayer)
    this.trapRemaining[currentPlayer] = 0
    this.clearArmedAbilities()
  }

  consumeShield(currentPlayer, index) {
    this.shieldRemaining[currentPlayer] = 0
    this.protectedSquares.add(index)
    this.clearArmedAbilities()
  }

  clearTrapAt(index) {
    this.trapSquares.delete(index)
  }

  consumeClaimAt(index) {
    this.clearArmedAbilities()
    this.trapSquares.delete(index)
  }

  resolveTrapForPendingCell(index, currentPlayer) {
    const trapOwner = this.trapSquares.get(index)

    if (!trapOwner) {
      return {
        triggered: false,
      }
    }

    if (trapOwner === currentPlayer || !this.canFutureAbilityModifySquare(index)) {
      this.trapSquares.delete(index)
      return {
        triggered: false,
      }
    }

    this.trapSquares.delete(index)
    this.clearArmedAbilities()

    return {
      triggered: true,
      trapOwner,
    }
  }
}
