export class MatchSystem {
  constructor({ maxStages }) {
    this.maxStages = maxStages
    this.resetMatchState()
  }

  createStageScores() {
    return {
      X: 0,
      O: 0,
    }
  }

  resetMatchState() {
    this.currentStage = 1
    this.stageScores = this.createStageScores()
    this.matchComplete = false
    this.stageLocked = false
  }

  resetStageState() {
    this.stageLocked = false
  }

  lockStage() {
    this.stageLocked = true
  }

  getStageWinner(board, winningLines, player) {
    return winningLines.some((line) =>
      line.every((index) => {
        const row = Math.floor(index / 3)
        const column = index % 3

        return board[row][column] === player
      }),
    )
  }

  isBoardFull(board) {
    return board.every((row) => row.every((cell) => cell !== null))
  }

  hasAnyStageWinner(board, winningLines) {
    return this.getStageWinner(board, winningLines, 'X') || this.getStageWinner(board, winningLines, 'O')
  }

  awardStagePoint(player) {
    this.stageScores[player] += 1
    return this.stageScores
  }

  advanceStageOrCompleteMatch() {
    if (this.currentStage >= this.maxStages) {
      this.matchComplete = true
      this.stageLocked = true
      return { matchComplete: true, advanced: false }
    }

    this.currentStage += 1
    this.stageLocked = false
    return { matchComplete: false, advanced: true }
  }

  getMatchWinner() {
    if (this.stageScores.X === this.stageScores.O) {
      return null
    }

    return this.stageScores.X > this.stageScores.O ? 'X' : 'O'
  }
}
