/* ============================================================
   TurnIndicator — the single "whose turn is it now" display.
   A compact House sticker badge (cream pill, maroon ink, hard
   shadow) carrying the active team's mark (X = red, O = gold),
   a label, and the acting player's name. Gold outline when it's
   the viewer's OWN turn. Static — instant swaps, no animation.
   Renders from the snapshot's `turnActor` ({ team, name, playerId }).
   ============================================================ */
import { h } from '../dom.js'

export function TurnIndicator() {
  const avatar = h('div', { class: 'player__avatar' }, '')
  const label = h('span', { class: 'turn-indicator__label' }, '')
  const name = h('span', { class: 'turn-indicator__name' }, '')
  const text = h('div', { class: 'turn-indicator__text' }, label, name)
  const el = h('div', { class: 'turn-indicator' }, avatar, text)

  // actor: { team, name, ... } | null. viewerTeam: 'X' | 'O' | null.
  function update({ actor, viewerTeam } = {}) {
    if (!actor || !actor.team) {
      el.style.display = 'none'
      return
    }
    el.style.display = ''
    const team = actor.team
    const mine = Boolean(viewerTeam) && viewerTeam === team
    avatar.textContent = team
    avatar.classList.toggle('player__avatar--x', team === 'X')
    avatar.classList.toggle('player__avatar--o', team === 'O')
    el.classList.toggle('is-turn', mine)
    label.textContent = mine ? 'دورك الآن' : 'الدور الآن'
    name.textContent = actor.name || `الفريق ${team}`
  }

  return { el, update }
}
