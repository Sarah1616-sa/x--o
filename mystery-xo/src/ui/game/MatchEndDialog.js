/* MatchEndDialog — end-of-match overlay. Renders straight from the MATCH_END snapshot:
   winning team badge + a two-team scoreboard (each score is a big number BELOW its badge,
   so a Latin X/O never abuts a digit). House sticker style; RTL; no animations. */
import { h, button, badge } from '../dom.js'

const AR = '٠١٢٣٤٥٦٧٨٩'
const arDigits = (n) => String(n).replace(/[0-9]/g, (d) => AR[d])

export function MatchEndDialog({ winner, stageScores, currentStage, maxStages, onPlayAgain, onLeave }) {
  const isWin = winner === 'X' || winner === 'O'

  // one scoreboard column: team badge + its score as a standalone number below it
  const teamCol = (team) => {
    const cls = ['matchend__team']
    if (isWin) cls.push(team === winner ? 'matchend__team--win' : 'matchend__team--lose')
    return h('div', { class: cls.join(' ') },
      h('div', { class: `matchend__medallion matchend__medallion--${team.toLowerCase()}` }, team),
      h('div', { class: 'matchend__team-score' }, String(stageScores[team])),
    )
  }

  // Local play offers a replay; multiplayer (no onPlayAgain) shows only the single gold action.
  const actions = onPlayAgain
    ? [
        button('العب مجدداً', { variant: 'primary', onClick: onPlayAgain }),
        button('العودة للردهة', { variant: 'secondary', onClick: onLeave }),
      ]
    : [button('العودة للردهة', { variant: 'primary', onClick: onLeave })]

  const dialog = h('div', { class: 'dialog matchend' },
    isWin ? h('div', { class: 'matchend__congrats' }, badge('تهانينا')) : null,
    isWin
      ? h('div', { class: 'matchend__winner' },
          h('div', { class: 'matchend__crown' }, '👑'),
          h('div', { class: `matchend__badge matchend__badge--${winner.toLowerCase()}` }, winner),
        )
      : null,
    h('h3', null, isWin ? 'الفريق الفائز' : 'تعادل'),
    h('p', { class: 'matchend__round' }, `الجولة ${arDigits(currentStage)} من ${arDigits(maxStages)}`),
    h('div', { class: 'matchend__scoreboard' }, teamCol('X'), teamCol('O')),
    h('div', { class: 'stack' }, ...actions),
  )
  return h('div', { class: 'scrim' }, dialog)
}
