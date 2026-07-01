/* ============================================================
   GameEngine — authoritative, headless game orchestration.
   This is "GameScene without the DOM": it drives the SAME pure
   systems (TurnResolver / Ability / Question / Match) the client
   uses, but runs on the server as the single source of truth and
   emits a rich snapshot after every state change.

   Reuses the client's pure logic (no rule duplication / drift):
   imported from ../../../src/game/... — pure ES modules, no deps.
   ============================================================ */
import { QUESTION_BANK } from '../../../src/game/data/questions.js'
import { MAX_STAGES, QUESTION_TIME_LIMIT } from '../../../src/game/constants/gameConstants.js'
import { QuestionSystem } from '../../../src/game/systems/QuestionSystem.js'
import { MatchSystem } from '../../../src/game/systems/MatchSystem.js'
import { AbilitySystem } from '../../../src/game/systems/AbilitySystem.js'
import { TurnResolver } from '../../../src/game/systems/TurnResolver.js'

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]
const REVEAL_MS = 900
const STAGE_PAUSE_MS = 2200
const ABILITY_KEYS = ['power', 'shield', 'steal', 'trap']

function emptyBoard() {
  return [[null, null, null], [null, null, null], [null, null, null]]
}

export class GameEngine {
  // emit(): broadcast the current snapshot to the room (wired by socket.js).
  constructor({ maxStages = MAX_STAGES, teamSizes = { X: 1, O: 1 }, teamRosters = { X: [], O: [] }, questionBank = QUESTION_BANK, emit = () => {} } = {}) {
    this.questionSystem = new QuestionSystem({ questionBank, questionTimeLimit: QUESTION_TIME_LIMIT })
    this.matchSystem = new MatchSystem({ maxStages })
    this.abilitySystem = new AbilitySystem()
    this.turnResolver = new TurnResolver({
      abilitySystem: this.abilitySystem,
      matchSystem: this.matchSystem,
      winningLines: WINNING_LINES,
    })
    this.teamSizes = teamSizes
    this.teamRosters = teamRosters // { X: [names], O: [names] } — for the answerer label
    this.emit = emit

    this.board = emptyBoard()
    this.currentTurnTeam = 'X'
    this.pendingCellIndex = null
    this.phase = 'TURN_IDLE' // TURN_IDLE | QUESTION_OPEN | STAGE_END | MATCH_END
    this.banner = null
    this.reveal = null // { selectedIndex, correctIndex } during the answer reveal
    this.matchWinner = null
    this.questionSeq = 0 // bumps each new question so the client can key its dialog
    this.timerId = null
    this.timeouts = new Set()
  }

  start() {
    this.emit()
  }

  destroy() {
    this.stopTimer()
    this.timeouts.forEach((id) => clearTimeout(id))
    this.timeouts.clear()
  }

  isMatchOver() {
    return this.phase === 'MATCH_END'
  }

  // a team has no connected players left → end the match for the other team
  forfeit(winner) {
    if (this.phase === 'MATCH_END') return
    this.stopTimer()
    this.timeouts.forEach((id) => clearTimeout(id))
    this.timeouts.clear()
    this.matchSystem.matchComplete = true
    this.phase = 'MATCH_END'
    this.matchWinner = winner ?? null
    this.banner = winner ? `فاز الفريق ${winner} بالمباراة` : 'انتهت المباراة'
    this.emit()
  }

  /* -------------------- timer-safe scheduling -------------------- */
  later(fn, ms) {
    const id = setTimeout(() => {
      this.timeouts.delete(id)
      fn()
    }, ms)
    this.timeouts.add(id)
    return id
  }

  /* -------------------- intents (called by socket handlers) -------------------- */
  selectCell(team, index) {
    if (this.phase !== 'TURN_IDLE') return
    if (team !== this.currentTurnTeam) return
    if (!Number.isInteger(index) || index < 0 || index > 8) return
    this.applyTurnResult(
      this.turnResolver.handleCellClick({
        index,
        board: this.board,
        currentPlayer: this.currentTurnTeam,
        matchComplete: this.matchSystem.matchComplete,
        stageLocked: this.matchSystem.stageLocked,
        questionOpen: this.questionSystem.questionOpen,
      }),
    )
  }

  activateAbility(team, key) {
    if (this.phase !== 'TURN_IDLE') return
    if (team !== this.currentTurnTeam) return
    if (!ABILITY_KEYS.includes(key)) return
    const ctx = {
      board: this.board,
      currentPlayer: this.currentTurnTeam,
      matchComplete: this.matchSystem.matchComplete,
      stageLocked: this.matchSystem.stageLocked,
      questionOpen: this.questionSystem.questionOpen,
    }
    // tap an already-armed ability to disarm
    if (this.armedKey() === key) {
      this.abilitySystem.clearArmedAbilities()
      this.emit()
      return
    }
    const a = this.abilitySystem
    if (key === 'power' && a.canActivatePower(ctx)) a.activatePower(this.currentTurnTeam)
    else if (key === 'shield' && a.canActivateShield(ctx)) a.activateShield(this.currentTurnTeam)
    else if (key === 'steal' && a.canActivateSteal(ctx)) a.activateSteal(this.currentTurnTeam)
    else if (key === 'trap' && a.canActivateTrap(ctx)) a.activateTrap(this.currentTurnTeam)
    else return
    this.emit()
  }

  submitAnswer(team, answerIndex) {
    if (this.phase !== 'QUESTION_OPEN') return
    if (team !== this.currentTurnTeam) return // only the answering team
    if (this.reveal) return // already answered, in reveal window
    const options = this.questionSystem.activeQuestion?.options
    if (!options || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) return
    if (!this.questionSystem.setAnswer(answerIndex)) return
    this.stopTimer()
    const correctIndex = this.questionSystem.activeQuestion.correctAnswerIndex
    const isCorrect = this.questionSystem.isAnswerCorrect()
    this.reveal = { selectedIndex: answerIndex, correctIndex }
    this.emit()
    this.later(() => this.finishQuestion(isCorrect ? 'CORRECT' : 'WRONG'), REVEAL_MS)
  }

  /* -------------------- internal orchestration (mirrors GameScene) -------------------- */
  applyTurnResult(result) {
    if (!result) return
    switch (result.type) {
      case 'OPEN_QUESTION':
        this.pendingCellIndex = result.cellIndex
        this.openQuestion()
        return
      case 'CLAIM_CELL':
      case 'POWER_CLAIM':
        this.setCell(result.cellIndex, result.team)
        this.pendingCellIndex = null
        this.abilitySystem.consumeClaimAt(result.cellIndex)
        this.applyBoardOutcome(result.team)
        return
      case 'TRAP_TRIGGER':
        this.setCell(result.cellIndex, result.team)
        this.pendingCellIndex = null
        this.abilitySystem.resolveTrapForPendingCell(result.cellIndex, this.currentTurnTeam)
        this.applyBoardOutcome(result.team)
        return
      case 'APPLY_STEAL':
        this.setCell(result.cellIndex, result.team)
        this.abilitySystem.consumeSteal(this.currentTurnTeam, result.cellIndex)
        this.applyBoardOutcome(result.team)
        return
      case 'APPLY_SHIELD':
        this.abilitySystem.consumeShield(this.currentTurnTeam, result.cellIndex)
        this.applyTurnResult(this.turnResolver.createSwitchTurnResult('SHIELD_APPLIED'))
        return
      case 'PLACE_TRAP':
        this.abilitySystem.consumeTrapPlacement(this.currentTurnTeam, result.cellIndex)
        this.applyTurnResult(this.turnResolver.createSwitchTurnResult('TRAP_PLACED'))
        return
      case 'SWITCH_TURN':
        this.switchTurn()
        return
      case 'STAGE_WIN':
        this.declareStageWinner(result.team)
        return
      case 'STAGE_DRAW':
        this.declareStageDraw()
        return
      default:
        return
    }
  }

  applyBoardOutcome(team) {
    // a claim mutated the board; emit, then resolve win/draw/switch
    const outcome = this.turnResolver.resolveBoardOutcome(this.board, team)
    if (outcome && outcome.type === 'SWITCH_TURN') {
      this.switchTurn()
    } else {
      this.applyTurnResult(outcome)
    }
  }

  switchTurn() {
    this.currentTurnTeam = this.currentTurnTeam === 'X' ? 'O' : 'X'
    this.abilitySystem.clearArmedAbilities()
    this.emit()
  }

  /* -------------------- question flow -------------------- */
  openQuestion() {
    const question = this.questionSystem.getNextQuestion()
    this.questionSystem.openQuestion(question, {
      team: this.currentTurnTeam,
      teamSize: this.teamSizes[this.currentTurnTeam] || 1,
    })
    this.phase = 'QUESTION_OPEN'
    this.reveal = null
    this.questionSeq += 1
    this.startTimer()
    this.emit()
  }

  finishQuestion(result) {
    const correct = result === 'CORRECT'
    const pending = this.pendingCellIndex
    this.closeQuestion()
    if (correct) {
      this.applyTurnResult(
        this.turnResolver.resolvePendingCell({
          board: this.board,
          pendingCellIndex: pending,
          currentPlayer: this.currentTurnTeam,
        }),
      )
    } else {
      this.pendingCellIndex = null
      this.applyTurnResult(this.turnResolver.resolveIncorrectAnswer())
    }
  }

  closeQuestion() {
    this.stopTimer()
    this.reveal = null
    this.questionSystem.closeQuestion()
    if (this.phase === 'QUESTION_OPEN') this.phase = 'TURN_IDLE'
  }

  startTimer() {
    this.stopTimer()
    this.timerId = setInterval(() => {
      if (this.phase !== 'QUESTION_OPEN' || this.reveal) {
        this.stopTimer()
        return
      }
      const { expired } = this.questionSystem.tickTimer()
      if (expired) {
        this.handleTimeout()
      } else {
        this.emit()
      }
    }, 1000)
  }
  stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }
  handleTimeout() {
    if (this.phase !== 'QUESTION_OPEN' || this.reveal) return
    this.stopTimer()
    this.pendingCellIndex = null
    this.reveal = { selectedIndex: -1, correctIndex: this.questionSystem.activeQuestion.correctAnswerIndex }
    this.emit()
    this.later(() => {
      this.closeQuestion()
      this.applyTurnResult(this.turnResolver.resolveQuestionTimeout())
    }, REVEAL_MS)
  }

  /* -------------------- stage / match end -------------------- */
  declareStageWinner(team) {
    this.matchSystem.lockStage()
    this.matchSystem.awardStagePoint(team)
    this.phase = 'STAGE_END'
    this.banner = `فاز الفريق ${team} بالجولة`
    this.emit()
    this.later(() => this.advanceOrFinish(), STAGE_PAUSE_MS)
  }
  declareStageDraw() {
    this.matchSystem.lockStage()
    this.phase = 'STAGE_END'
    this.banner = 'تعادل الجولة'
    this.emit()
    this.later(() => this.advanceOrFinish(), STAGE_PAUSE_MS)
  }
  advanceOrFinish() {
    const { matchComplete } = this.matchSystem.advanceStageOrCompleteMatch()
    if (matchComplete) {
      this.phase = 'MATCH_END'
      this.matchWinner = this.matchSystem.getMatchWinner()
      this.banner = this.matchWinner ? `فاز الفريق ${this.matchWinner} بالمباراة` : 'تعادل'
      this.emit()
    } else {
      this.resetStage()
    }
  }
  resetStage() {
    this.board = emptyBoard()
    this.banner = null
    this.reveal = null
    this.abilitySystem.resetStageState()
    this.pendingCellIndex = null
    this.questionSystem.resetAnswer()
    this.matchSystem.resetStageState()
    this.currentTurnTeam = 'X'
    this.phase = 'TURN_IDLE'
    this.emit()
  }

  /* -------------------- helpers -------------------- */
  setCell(index, team) {
    this.board[Math.floor(index / 3)][index % 3] = team
  }
  flatBoard() {
    return this.board.flat()
  }
  armedKey() {
    const a = this.abilitySystem
    const t = this.currentTurnTeam
    if (a.powerArmedTeam === t) return 'power'
    if (a.shieldArmedTeam === t) return 'shield'
    if (a.stealArmedTeam === t) return 'steal'
    if (a.trapArmedTeam === t) return 'trap'
    return null
  }
  // Per-ability state the client renders directly: enabled | armed | used | disabled.
  // Computed authoritatively (incl. valid-target checks); the non-turn team sees all disabled.
  abilityStateFor(team) {
    const a = this.abilitySystem
    const yourTurn = team === this.currentTurnTeam && this.phase === 'TURN_IDLE'
    const armed = team === this.currentTurnTeam ? this.armedKey() : null
    const ctx = {
      board: this.board,
      currentPlayer: team,
      matchComplete: this.matchSystem.matchComplete,
      stageLocked: this.matchSystem.stageLocked,
      questionOpen: this.questionSystem.questionOpen,
    }
    const stateOf = (key, remaining, canActivate) => {
      if (armed === key) return 'armed'
      if (remaining <= 0) return 'used'
      if (yourTurn && canActivate) return 'enabled'
      return 'disabled'
    }
    return {
      power: stateOf('power', a.powerRemaining[team], a.canActivatePower(ctx)),
      shield: stateOf('shield', a.shieldRemaining[team], a.canActivateShield(ctx)),
      steal: stateOf('steal', a.stealRemaining[team], a.canActivateSteal(ctx)),
      trap: stateOf('trap', a.trapRemaining[team], a.canActivateTrap(ctx)),
    }
  }

  /* -------------------- the authoritative snapshot sent to clients -------------------- */
  snapshot() {
    const q = this.questionSystem
    return {
      phase: this.phase,
      board: this.flatBoard(),
      currentTurnTeam: this.currentTurnTeam,
      currentStage: this.matchSystem.currentStage,
      maxStages: this.matchSystem.maxStages,
      stageScores: { ...this.matchSystem.stageScores },
      stageLocked: this.matchSystem.stageLocked,
      matchComplete: this.matchSystem.matchComplete,
      matchWinner: this.matchWinner,
      banner: this.banner,
      // protected (shield) squares are public; trap squares are intentionally hidden
      protectedSquares: [...this.abilitySystem.protectedSquares],
      abilities: { X: this.abilityStateFor('X'), O: this.abilityStateFor('O') },
      question:
        this.phase === 'QUESTION_OPEN' && q.activeQuestion
          ? {
              seq: this.questionSeq,
              prompt: q.activeQuestion.question,
              options: [...q.activeQuestion.options],
              timeRemaining: q.questionTimeRemaining,
              answeringTeam: this.currentTurnTeam,
              answererNumber: q.activeAnswererNumber,
              answererName: this.answererName(),
              // correctAnswerIndex is withheld until the reveal (anti-cheat)
              reveal: this.reveal,
            }
          : null,
    }
  }

  answererName() {
    const roster = this.teamRosters[this.currentTurnTeam] || []
    if (!roster.length) return null
    const idx = (this.questionSystem.activeAnswererNumber - 1) % roster.length
    return roster[idx] ?? null
  }
}
