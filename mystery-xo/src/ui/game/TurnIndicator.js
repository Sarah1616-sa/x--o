/* ============================================================
   TurnIndicator — a static "whose turn is it now" illustration.
   Uses the House player-chip: a cream sticker avatar carrying the
   active team's mark (X = red, O = gold), the acting player's name
   beneath, and a gold outline when it's the viewer's OWN turn.
   Everything is an instant style swap — no transitions/animations.
   Renders from the snapshot's `turnActor` ({ team, name, number }).
   ============================================================ */
import { h } from '../dom.js'

export function TurnIndicator() {
  const label = h('p', { class: 'turn-indicator__label' }, '')
  const avatar = h('div', { class: 'player__avatar' }, '')
  const name = h('div', { class: 'player__name' }, '')
  const player = h('div', { class: 'player' }, avatar, name)
  const el = h('div', { class: 'turn-indicator' }, label, player)

  // actor: { team, name, number } | null. viewerTeam: 'X' | 'O' | null.
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
    name.textContent = actor.name || `الفريق ${team}`
    player.classList.toggle('is-turn', mine)
    label.textContent = mine ? 'دورك الآن' : 'الدور الآن'
  }

  return { el, update }
}
