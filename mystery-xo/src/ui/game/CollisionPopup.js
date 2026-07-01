/* CollisionPopup — timed announcement for a same-cell ability collision.
   Pure announcement: NO button. The server owns the countdown and auto-opens the shared
   challenge question when it hits zero. `هل أنت مستعد؟` is flavor text, not an action. */
import { h } from '../dom.js'

export function CollisionPopup({ text, subtext }) {
  const timerEl = h('div', { class: 'qtimer' }, '')

  const dialog = h('div', { class: 'dialog collision' },
    h('p', { class: 'collision__text' }, text),
    h('p', { class: 'collision__ready' }, subtext),
    h('div', { style: { textAlign: 'center' } }, timerEl),
  )
  const el = h('div', { class: 'scrim' }, dialog)

  function setTimer(n) {
    timerEl.textContent = `تبدأ الأسئلة خلال: ${n}`
    timerEl.classList.toggle('is-warn', n <= 5)
  }

  return { el, setTimer }
}
