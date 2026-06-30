/* InfoBar — scoreboard (X | stage | O) + a prominent turn line. */
import { h } from '../dom.js'

export function InfoBar() {
  const xScore = h('span', { class: 'score-col__score' }, '0')
  const oScore = h('span', { class: 'score-col__score' }, '0')
  const stageEl = h('span', { class: 'score-mid__stage' }, '')
  const xCol = h('div', { class: 'score-col' }, h('span', { class: 'score-col__mark score-col__mark--x' }, 'X'), xScore)
  const oCol = h('div', { class: 'score-col' }, h('span', { class: 'score-col__mark score-col__mark--o' }, 'O'), oScore)
  const turn = h('p', { class: 'turnline' }, '')

  const el = h('div', { class: 'gamebar' },
    h('div', { class: 'scoreboard' },
      xCol,
      h('div', { class: 'score-mid' }, h('span', { class: 'score-mid__label' }, 'الجولة'), stageEl),
      oCol,
    ),
    turn,
  )

  // `banner` (a stage win/draw line) takes precedence over the turn text, so a
  // re-render during the stage pause can never silently clobber it.
  function update({ currentPlayer, currentStage, maxStages, stageScores, banner = null }) {
    xScore.textContent = String(stageScores.X)
    oScore.textContent = String(stageScores.O)
    stageEl.textContent = `${currentStage}/${maxStages}`
    xCol.classList.toggle('is-active', currentPlayer === 'X')
    oCol.classList.toggle('is-active', currentPlayer === 'O')
    turn.textContent = banner ?? `دور الفريق ${currentPlayer}`
  }

  return { el, update }
}
