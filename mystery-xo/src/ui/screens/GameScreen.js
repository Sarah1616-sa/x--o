/* ============================================================
   GameScreen — server-authoritative online game (no local mode).
   The server runs the whole game (questions / abilities / turns /
   stages) over the shared systems and broadcasts `game:snapshot`.
   This screen is a thin client: it RENDERS from the snapshot and
   SENDS intents (cell:select / ability:activate / answer:select).
   It holds no game rules of its own.
   ============================================================ */
import { h, button, topbar, logo, toast } from '../dom.js'
import { socketService } from '../../network/socketService.js'
import { InfoBar } from '../game/InfoBar.js'
import { TurnIndicator } from '../game/TurnIndicator.js'
import { Board } from '../game/Board.js'
import { AbilityBar } from '../game/AbilityBar.js'
import { QuestionDialog } from '../game/QuestionDialog.js'
import { CollisionPopup } from '../game/CollisionPopup.js'
import { MatchEndDialog } from '../game/MatchEndDialog.js'

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]
const ABILITY_KEYS = ['power', 'shield', 'steal', 'trap']

export function GameScreen(nav, { room } = {}) {
  let game = null // latest authoritative snapshot
  let questionDialog = null
  let questionSeq = null // server's question id the current dialog is showing
  let collisionPopup = null // timed ability-collision announcement (before the challenge)
  let matchEndEl = null
  const unsubs = []

  // Resolve my team lazily from the freshest source (survives a late identity).
  function myTeam() {
    const id = socketService.getSelfPlayerId?.()
    return socketService.getRoomSnapshot?.()?.players?.[id]?.team ?? room?.players?.[id]?.team ?? null
  }

  // ---- components (dumb renderers; click handlers send intents) ----
  const infoBar = InfoBar()
  const turnIndicator = TurnIndicator()
  const board = Board((i) => onCell(i))
  const abilityBar = AbilityBar((key) => onAbility(key))

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
      turnIndicator.el,
      h('div', { style: { flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '0', width: '100%' } }, board.el),
      abilityBar.el,
    ),
  )

  /* -------------------- intents (server is authoritative + re-validates) -------------------- */
  function myTurn() {
    return Boolean(game) && game.phase === 'TURN_IDLE' && game.currentTurnTeam === myTeam()
  }
  function onCell(i) {
    if (myTurn()) socketService.selectCell(i)
  }
  function onAbility(key) {
    if (myTurn()) socketService.activateAbility(key)
  }

  /* -------------------- render from the snapshot -------------------- */
  function render(g) {
    if (!g) return
    game = g

    const mine = myTeam()
    const turnText =
      g.phase === 'MATCH_END'
        ? ''
        : g.banner ?? (g.currentTurnTeam === mine ? 'دورك' : `دور الفريق ${g.currentTurnTeam}`)
    infoBar.update({
      currentPlayer: g.currentTurnTeam,
      currentStage: g.currentStage,
      maxStages: g.maxStages,
      stageScores: g.stageScores,
      banner: turnText,
    })

    // Per-player "whose turn now" illustration (null in phases with no single actor).
    turnIndicator.update({ actor: g.turnActor, viewerTeam: mine })

    board.render({
      board: flatToMatrix(g.board || []),
      winLine: computeWinLine(g),
      targets: targets(g),
      protectedSet: new Set(g.protectedSquares || []),
      // only my own traps arrive in the snapshot; the enemy never receives theirs
      trapSet: new Set(g.myTraps || []),
    })

    abilityBar.update(mapAbilities(g.abilities?.[mine]))
    syncAnnouncement(g)
    syncQuestion(g)

    if (g.phase === 'MATCH_END') showMatchEnd(g)
    else if (matchEndEl) { matchEndEl.remove(); matchEndEl = null }
  }

  function mapAbilities(a) {
    const s = a || {}
    return {
      power: { state: s.power || 'disabled' },
      shield: { state: s.shield || 'disabled' },
      steal: { state: s.steal || 'disabled' },
      trap: { state: s.trap || 'disabled' },
    }
  }

  function computeWinLine(g) {
    // only on the stage-end pause (match-end is covered by the dialog scrim)
    if (g.phase !== 'STAGE_END') return null
    const flat = g.board || []
    for (const team of ['X', 'O']) {
      const line = WINNING_LINES.find((l) => l.every((i) => flat[i] === team))
      if (line) return line
    }
    return null
  }

  // gold target outlines for my armed ability (server still validates the drop)
  function targets(g) {
    const set = new Set()
    const team = myTeam()
    if (g.currentTurnTeam !== team || g.phase !== 'TURN_IDLE') return set
    const a = g.abilities?.[team] || {}
    const armed = ABILITY_KEYS.find((k) => a[k] === 'armed')
    if (!armed) return set
    const flat = g.board || []
    const prot = new Set(g.protectedSquares || [])
    for (let i = 0; i < 9; i += 1) {
      const v = flat[i]
      if (armed === 'power' && v === null) set.add(i)
      else if (armed === 'shield' && v === team && !prot.has(i)) set.add(i)
      else if (armed === 'steal' && v && v !== team && !prot.has(i)) set.add(i)
      else if (armed === 'trap' && v === null) set.add(i)
    }
    return set
  }

  // A collision snapshot lets me answer if the server says I'm still eligible (both teams
  // race); a normal question only if it's my team's turn to answer.
  function canAnswer(q) {
    if (!q || q.reveal) return false
    return q.mode === 'collision' ? !!q.answerable : q.answeringTeam === myTeam()
  }

  function syncQuestion(g) {
    const q = g.question
    if (!q) {
      if (questionDialog) { questionDialog.el.remove(); questionDialog = null; questionSeq = null }
      return
    }
    const collision = q.mode === 'collision'
    // keyed on the server's question seq so a new question always gets a fresh dialog
    if (!questionDialog || q.seq !== questionSeq) {
      if (questionDialog) questionDialog.el.remove()
      questionSeq = q.seq
      questionDialog = QuestionDialog({
        question: { question: q.prompt, options: q.options },
        who: collision ? null : { team: q.answeringTeam, number: q.answererNumber },
        collision,
        answerable: canAnswer(q),
        onSelect: (i) => {
          if (canAnswer(game?.question)) {
            questionDialog.markSelected(i) // optimistic lock until the reveal snapshot lands
            socketService.submitAnswer(i)
          }
        },
      })
      el.append(questionDialog.el)
    }
    questionDialog.setTimer(q.timeRemaining)
    // collision: reflect the server-confirmed lock (e.g. after a reload) and the wait state
    if (collision && !q.reveal) {
      if (q.myChoice != null) questionDialog.markSelected(q.myChoice)
      questionDialog.setWaiting?.((q.myChoice != null || q.lockedOut) && !q.winner)
    }
    if (q.reveal) questionDialog.reveal(q.reveal.selectedIndex, q.reveal.correctIndex)
  }

  function syncAnnouncement(g) {
    const a = g.phase === 'COLLISION_ANNOUNCE' ? g.announcement : null
    if (!a) {
      if (collisionPopup) { collisionPopup.el.remove(); collisionPopup = null }
      return
    }
    if (!collisionPopup) {
      collisionPopup = CollisionPopup({ text: a.text, subtext: a.subtext })
      el.append(collisionPopup.el)
    }
    collisionPopup.setTimer(a.timeRemaining)
  }

  function showMatchEnd(g) {
    if (matchEndEl) return
    matchEndEl = MatchEndDialog({
      winner: g.matchWinner,
      stageScores: g.stageScores,
      currentStage: g.currentStage,
      maxStages: g.maxStages,
      onPlayAgain: null, // server-authoritative: no local replay
      onLeave: leaveGame,
    })
    el.append(matchEndEl)
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
    import('./LobbyScreen.js').then((m) => nav.show(m.LobbyScreen))
  }
  function cleanup() {
    unsubs.forEach((u) => u())
    unsubs.length = 0
  }

  /* -------------------- wiring -------------------- */
  unsubs.push(socketService.on('game:snapshot', (p) => render(p?.game ?? p?.room?.game)))
  unsubs.push(socketService.on('action:error', (p) => { if (p?.message) toast(p.message, { error: true }) }))
  render(socketService.getGameSnapshot())

  return { el, destroy: cleanup }
}
