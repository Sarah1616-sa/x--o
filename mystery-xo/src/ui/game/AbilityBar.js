/* AbilityBar — four ability chips (power / shield / steal / trap).
   States: enabled | armed (gold) | used | disabled. Tap to arm/disarm. */
import { h } from '../dom.js'
import { ABILITY_NAMES, ABILITY_DESCRIPTIONS } from '../../game/constants/abilityNames.js'

const KEYS = ['power', 'shield', 'steal', 'trap']
const HINT = { enabled: 'متاحة', armed: 'جاهزة', used: 'مُستخدمة', disabled: 'غير متاح' }

export function AbilityBar(onArm) {
  const chips = {}
  const els = KEYS.map((key) => {
    const countEl = h('span', { class: 'ability__count' }, '')
    const xEl = h('span', { class: 'ability__x', style: { display: 'none' } }, '✕')
    const chip = h('button', {
      class: 'ability',
      type: 'button',
      title: ABILITY_DESCRIPTIONS[key],
      'aria-label': `${ABILITY_NAMES[key]} — ${ABILITY_DESCRIPTIONS[key]}`,
      onClick: () => onArm(key),
    }, xEl, h('span', { class: 'ability__name' }, ABILITY_NAMES[key]), countEl)
    chips[key] = { chip, countEl, xEl }
    return chip
  })
  const el = h('div', { class: 'abilitybar' }, ...els)

  function update(states) {
    KEYS.forEach((key) => {
      const { state } = states[key]
      const { chip, countEl, xEl } = chips[key]
      chip.classList.remove('is-armed', 'is-used', 'is-disabled')
      xEl.style.display = 'none'
      if (state === 'armed') chip.classList.add('is-armed')
      else if (state === 'used') { chip.classList.add('is-used'); xEl.style.display = 'grid' }
      else if (state === 'disabled') chip.classList.add('is-disabled')
      countEl.textContent = HINT[state]
    })
  }

  return { el, update }
}
