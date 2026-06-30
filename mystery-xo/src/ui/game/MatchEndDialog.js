/* MatchEndDialog — end-of-match overlay: winner mark, final score, replay / leave. */
import { h, button } from '../dom.js'

export function MatchEndDialog({ winner, stageScores, onPlayAgain, onLeave }) {
  const markCls =
    winner === 'X' ? 'matchend__mark matchend__mark--x'
    : winner === 'O' ? 'matchend__mark matchend__mark--o'
    : 'matchend__mark matchend__mark--draw'

  const dialog = h('div', { class: 'dialog' },
    h('div', { class: markCls }, winner ?? '='),
    h('h3', null, winner ? `فاز الفريق ${winner}` : 'تعادل'),
    h('p', { class: 'matchend__score' }, `X ${stageScores.X} - ${stageScores.O} O`),
    h('div', { class: 'stack' },
      button('العب مجدداً', { variant: 'primary', onClick: onPlayAgain }),
      button('العودة للردهة', { variant: 'secondary', onClick: onLeave }),
    ),
  )
  return h('div', { class: 'scrim' }, dialog)
}
