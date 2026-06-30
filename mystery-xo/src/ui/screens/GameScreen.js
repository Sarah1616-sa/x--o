/* ============================================================
   GameScreen — the in-game experience (full DOM/CSS rebuild of the
   1537-line Phaser GameScene). Dual mode, exactly as the original:
     • LOCAL  : the full game runs client-side via the preserved
                pure systems (TurnResolver / Ability / Question / Match).
     • SYNC   : when socketService.isMultiplayerActive() (server populates
                room.game), the board mirrors server events and the
                client-only abilities/questions are disabled.
   Abilities are armed by TAP (not drag — drag needed tweens the skill bans).
   ============================================================ */
import { h, button, topbar, logo } from '../dom.js'
import { socketService } from '../../network/socketService.js'
import { QUESTION_BANK } from '../../game/data/questions.js'
import { MAX_STAGES, QUESTION_TIME_LIMIT } from '../../game/constants/gameConstants.js'
import { QuestionSystem } from '../../game/systems/QuestionSystem.js'
import { MatchSystem } from '../../game/systems/MatchSystem.js'
import { AbilitySystem } from '../../game/systems/AbilitySystem.js'
import { TurnResolver } from '../../game/systems/TurnResolver.js'
import { InfoBar } from '../game/InfoBar.js'
import { Board } from '../game/Board.js'
import { AbilityBar } from '../game/AbilityBar.js'
import { QuestionDialog } from '../game/QuestionDialog.js'
import { MatchEndDialog } from '../game/MatchEndDialog.js'

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

const REVEAL_MS = 750
const STAGE_PAUSE_MS = 2000

export function GameScreen(nav, { room } = {}) {
  // ---- preserved game logic (pure systems) ----
  const questionSystem = new QuestionSystem({ questionBank: QUESTION_BANK, questionTimeLimit: QUESTION_TIME_LIMIT })
  const matchSystem = new MatchSystem({ maxStages: room?.settings?.stageCount ?? MAX_STAGES })
  const abilitySystem = new AbilitySystem()
  const turnResolver = new TurnResolver({ abilitySystem, matchSystem, winningLines: WINNING_LINES })

  const teamSizes = room?.teams
    ? { X: room.teams.X?.playerIds?.length || 1, O: room.teams.O?.playerIds?.length || 1 }
    : { X: 1, O: 1 }
  const isMultiplayerMode = socketService.isMultiplayerActive?.() ?? false

  // ---- view state ----
  let board = emptyBoard()
  let currentPlayer = 'X'
  let pendingCellIndex = null
  let answerLocked = false
  let resolving = false // guards the submit/timeout mutual-exclusion (no double-resolve)
  let winningLine = null
  let banner = null // stage win/draw line; part of render state so it can't be clobbered
  let timerId = null
  let destroyed = false
  const pendingTimeouts = []
  let questionDialog = null
  let matchEndEl = null
  const unsubs = []

  // setTimeout that is tracked + auto-cancelled on teardown (Phaser's delayedCall
  // was scene-scoped and auto-cleared; raw setTimeout is not, so we track ids).
  function later(fn, ms) {
    const id = setTimeout(() => {
      const idx = pendingTimeouts.indexOf(id)
      if (idx >= 0) pendingTimeouts.splice(idx, 1)
      if (!destroyed) fn()
    }, ms)
    pendingTimeouts.push(id)
    return id
  }

  // ---- components ----
  const infoBar = InfoBar()
  const boardComp = Board((i) => handleCellClick(i))
  const abilityBar = AbilityBar((key) => onArm(key))

  const el = h('main', { class: 'screen' },
    h('header', { class: 'screen__top' },
      topbar(
        logo({ variant: 'topbar' }),
        h('h1', { class: 'topbar__title' }, 'اكس او'),
        h('span', { class: 'spacer' }),
        button('مغادرة', { variant: 'secondary', block: false, sm: true, pill: true, onClick: leaveGame }),
      ),
    ),
    h('div', { class: 'screen__body', style: { justifyContent: 'space-between', gap: 'var(--s-4)' } },
      infoBar.el,
      h('div', { style: { flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '0', width: '100%' } }, boardComp.el),
      abilityBar.el,
    ),
  )

  function emptyBoard() {
    return [[null, null, null], [null, null, null], [null, null, null]]
  }
  function setCell(index, team) {
    board[Math.floor(index / 3)][index % 3] = team
  }

  /* -------------------- cell click / turn resolution -------------------- */
  function handleCellClick(index) {
  if (isMultiplayerMode) {
    try {
      socketService.selectCell(index)
    } catch (e) {
      console.error(e)
    }

    return
  }

  applyTurnResult(turnResolver.handleCellClick({
    index,
    board,
    currentPlayer,
    matchComplete: matchSystem.matchComplete,
    stageLocked: matchSystem.stageLocked,
    questionOpen: questionSystem.questionOpen,
  }))
}


  function applyBoardOutcome(team) {
    applyTurnResult(turnResolver.resolveBoardOutcome(board, team))
  }

  function switchTurn() {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X'
    abilitySystem.clearArmedAbilities()
    render()
  }

  /* -------------------- abilities (tap to arm / disarm) -------------------- */
  function armedKey() {
    if (abilitySystem.powerArmedTeam === currentPlayer) return 'power'
    if (abilitySystem.shieldArmedTeam === currentPlayer) return 'shield'
    if (abilitySystem.stealArmedTeam === currentPlayer) return 'steal'
    if (abilitySystem.trapArmedTeam === currentPlayer) return 'trap'
    return null
  }

  function abilityCtx() {
    return {
      board,
      currentPlayer,
      matchComplete: matchSystem.matchComplete,
      stageLocked: matchSystem.stageLocked,
      questionOpen: questionSystem.questionOpen,
    }
  }

  function onArm(key) {
    if (isMultiplayerMode) return
    if (armedKey() === key) { abilitySystem.clearArmedAbilities(); render(); return }
    const ctx = abilityCtx()
    if (key === 'power' && abilitySystem.canActivatePower(ctx)) abilitySystem.activatePower(currentPlayer)
    else if (key === 'shield' && abilitySystem.canActivateShield(ctx)) abilitySystem.activateShield(currentPlayer)
    else if (key === 'steal' && abilitySystem.canActivateSteal(ctx)) abilitySystem.activateSteal(currentPlayer)
    else if (key === 'trap' && abilitySystem.canActivateTrap(ctx)) abilitySystem.activateTrap(currentPlayer)
    render()
  }

  function abilityStates() {
    const armed = armedKey()
    const ctx = abilityCtx()
    const make = (key, remaining, canActivate) => {
      let state
      if (armed === key) state = 'armed'
      else if (remaining <= 0) state = 'used'
      else if (canActivate && !isMultiplayerMode) state = 'enabled'
      else state = 'disabled'
      return { state, count: remaining }
    }
    return {
      power: make('power', abilitySystem.powerRemaining[currentPlayer], abilitySystem.canActivatePower(ctx)),
      shield: make('shield', abilitySystem.shieldRemaining[currentPlayer], abilitySystem.canActivateShield(ctx)),
      steal: make('steal', abilitySystem.stealRemaining[currentPlayer], abilitySystem.canActivateSteal(ctx)),
      trap: make('trap', abilitySystem.trapRemaining[currentPlayer], abilitySystem.canActivateTrap(ctx)),
    }
  }

  function targetsForArmed() {
    const set = new Set()
    const armed = armedKey()
    if (!armed) return set
    for (let i = 0; i < 9; i += 1) {
      const empty = turnResolver.isSquareEmpty(board, i)
      if (armed === 'steal' && turnResolver.isSquareOwnedByOpponent(board, i, currentPlayer) && abilitySystem.canFutureAbilityModifySquare(i)) set.add(i)
      else if (armed === 'shield' && turnResolver.isSquareOwnedByCurrentTeam(board, i, currentPlayer) && !abilitySystem.isSquareProtected(i)) set.add(i)
      else if (armed === 'trap' && empty && !abilitySystem.trapSquares.has(i)) set.add(i)
      else if (armed === 'power' && empty) set.add(i)
    }
    return set
  }

  /* -------------------- question flow -------------------- */
  function openQuestion(question) {
    answerLocked = false
    questionSystem.openQuestion(question, { team: currentPlayer, teamSize: teamSizes[currentPlayer] })
    questionDialog = QuestionDialog({
      question,
      who: { team: currentPlayer, number: questionSystem.activeAnswererNumber },
      onSelect: (i) => selectAnswer(i),
    })
    el.append(questionDialog.el)
    questionDialog.setTimer(questionSystem.questionTimeRemaining)
    startTimer()
    render()
  }

  function selectAnswer(i) {
    if (resolving || answerLocked) return
    if (!questionSystem.setAnswer(i)) return
    answerLocked = true
    stopTimer() // stop ticks the moment an answer is locked — kills the timeout race
    questionDialog.markSelected(i)
    later(submitAnswer, 450)
  }

  function submitAnswer() {
    if (resolving || !questionSystem.questionOpen || !questionSystem.hasAnswer()) return
    resolving = true
    stopTimer()
    const correctIndex = questionSystem.activeQuestion.correctAnswerIndex
    const isCorrect = questionSystem.isAnswerCorrect()
    if (questionDialog) questionDialog.reveal(questionSystem.selectedAnswerIndex, correctIndex)
    later(() => {
      closeQuestion()
      if (isCorrect) {
        applyTurnResult(turnResolver.resolvePendingCell({ board, pendingCellIndex, currentPlayer }))
      } else {
        pendingCellIndex = null
        applyTurnResult(turnResolver.resolveIncorrectAnswer())
      }
    }, REVEAL_MS)
  }

  function handleTimeout() {
    if (resolving || !questionSystem.questionOpen) return
    resolving = true
    stopTimer()
    pendingCellIndex = null
    if (questionDialog) questionDialog.reveal(-1, questionSystem.activeQuestion.correctAnswerIndex)
    later(() => {
      closeQuestion()
      applyTurnResult(turnResolver.resolveQuestionTimeout())
    }, REVEAL_MS)
  }

  function closeQuestion() {
    stopTimer()
    resolving = false
    if (questionDialog) { questionDialog.el.remove(); questionDialog = null }
    questionSystem.closeQuestion()
  }

  function startTimer() {
    stopTimer()
    timerId = setInterval(() => {
      if (!questionSystem.questionOpen) { stopTimer(); return }
      const { expired, timeRemaining } = questionSystem.tickTimer()
      if (questionDialog) questionDialog.setTimer(timeRemaining)
      if (expired) handleTimeout()
    }, 1000)
  }
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null }
  }

  /* -------------------- stage / match end -------------------- */
  function declareStageWinner(team) {
    matchSystem.lockStage()
    winningLine = findWinningLine(team)
    matchSystem.awardStagePoint(team)
    banner = `فاز الفريق ${team} بالجولة`
    render()
    later(advanceOrFinish, STAGE_PAUSE_MS)
  }
  function declareStageDraw() {
    matchSystem.lockStage()
    banner = 'تعادل الجولة'
    render()
    later(advanceOrFinish, STAGE_PAUSE_MS)
  }
  function advanceOrFinish() {
    const { matchComplete } = matchSystem.advanceStageOrCompleteMatch()
    if (matchComplete) showMatchEnd(matchSystem.getMatchWinner())
    else resetStage()
  }
  function resetStage() {
    board = emptyBoard()
    winningLine = null
    banner = null
    abilitySystem.resetStageState()
    pendingCellIndex = null
    questionSystem.resetAnswer()
    matchSystem.resetStageState()
    currentPlayer = 'X'
    render()
  }
  function findWinningLine(team) {
    const flat = board.flat()
    return WINNING_LINES.find((line) => line.every((i) => flat[i] === team)) ?? null
  }

  function showMatchEnd(winner) {
    if (matchEndEl) matchEndEl.remove()
    matchEndEl = MatchEndDialog({
      winner,
      stageScores: matchSystem.stageScores,
      onPlayAgain: resetMatch,
      onLeave: leaveGame,
    })
    el.append(matchEndEl)
  }
  function resetMatch() {
    if (matchEndEl) { matchEndEl.remove(); matchEndEl = null }
    closeQuestion()
    matchSystem.resetMatchState()
    abilitySystem.resetMatchState()
    questionSystem.resetQuestionIndex()
    questionSystem.resetAnswererRotation()
    resetStage()
  }

  /* -------------------- multiplayer sync (dormant unless server sends game) -------------------- */
  function setupMultiplayer() {
    if (!isMultiplayerMode) return
    applyServerSnapshot(socketService.getGameSnapshot())
    const listen = (ev, fn) => unsubs.push(socketService.on(ev, fn))
    listen('game:snapshot', (p) => applyServerSnapshot(p?.game ?? p?.room?.game))
    listen('board:update', (p) => applyServerSnapshot(p?.game ?? p?.room?.game))
    listen('turn:started', (p) => applyServerSnapshot(p?.game ?? p?.room?.game))
    listen('stage:end', (p) => {
      applyServerSnapshot(p?.game ?? p?.room?.game)
      banner = p?.winner ? `فاز الفريق ${p.winner} بالجولة` : 'تعادل الجولة'
      render()
    })
    listen('match:end', (p) => {
      applyServerSnapshot(p?.game ?? p?.room?.game)
      showMatchEnd(p?.winner ?? null)
    })
  }
  function applyServerSnapshot(game) {
    if (!game) return
    currentPlayer = game.currentTurnTeam ?? 'X'
    matchSystem.currentStage = game.currentStage ?? 1
    matchSystem.maxStages = game.maxStages ?? matchSystem.maxStages
    matchSystem.stageScores = game.stageScores ?? { X: 0, O: 0 }
    board = flatToMatrix(game.board ?? Array(9).fill(null))
    winningLine = null
    banner = null
    render()
  }
  function flatToMatrix(flat) {
    return [
      [flat[0] ?? null, flat[1] ?? null, flat[2] ?? null],
      [flat[3] ?? null, flat[4] ?? null, flat[5] ?? null],
      [flat[6] ?? null, flat[7] ?? null, flat[8] ?? null],
    ]
  }

  /* -------------------- leave + teardown -------------------- */
  function leaveGame() {
    cleanup()
    // Returns to the lobby; the room (if any) stays joined and re-renders.
    import('./LobbyScreen.js').then((m) => nav.show(m.LobbyScreen))
  }
  function cleanup() {
    destroyed = true
    stopTimer()
    pendingTimeouts.forEach(clearTimeout)
    pendingTimeouts.length = 0
    unsubs.forEach((u) => u())
    unsubs.length = 0
  }

  /* -------------------- render -------------------- */
  function render() {
    infoBar.update({
      currentPlayer,
      currentStage: matchSystem.currentStage,
      maxStages: matchSystem.maxStages,
      stageScores: matchSystem.stageScores,
      banner,
    })
    boardComp.render({
      board,
      winLine: winningLine,
      targets: targetsForArmed(),
      protectedSet: abilitySystem.protectedSquares,
    })
    abilityBar.update(abilityStates())
  }

  setupMultiplayer()
  render()

  return { el, destroy: cleanup }
}
