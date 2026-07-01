/* QuestionDialog — the question modal: who-answers, countdown, prompt, options.
   Tap an option to select (locks all); reveal shows correct/wrong.
   In `collision` mode BOTH teams answer the same question (first correct wins the
   cell), so the head is a race prompt and a "waiting" status shows once you're locked. */
import { h } from '../dom.js'

export function QuestionDialog({ question, who, onSelect, answerable = true, collision = false }) {
  const optionEls = question.options.map((opt, i) =>
    h('button', {
      class: 'qoption',
      type: 'button',
      style: answerable ? null : { pointerEvents: 'none' },
      onClick: answerable ? () => onSelect(i) : undefined,
    }, opt),
  )
  const timerEl = h('div', { class: 'qtimer' }, '')
  const statusEl = h('p', { class: 'qstatus', style: { display: 'none' } }, '')

  const headText = collision
    ? 'تحدّي! أول إجابة صحيحة تكسب المربّع'
    : answerable
      ? `دور الفريق ${who.team} — اللاعب ${who.number}`
      : `الفريق ${who.team} يجيب الآن…`

  const dialog = h('div', { class: 'dialog', style: { textAlign: 'start' } },
    h('p', { class: 'qhead' }, headText),
    h('div', { style: { textAlign: 'center' } }, timerEl),
    h('h3', { class: 'qprompt' }, question.question),
    h('div', { class: 'qoptions' }, ...optionEls),
    statusEl,
  )
  const el = h('div', { class: 'scrim' }, dialog)

  function setTimer(n) {
    timerEl.textContent = `الوقت: ${n}`
    timerEl.classList.toggle('is-warn', n <= 5)
  }

  function markSelected(i) {
    optionEls.forEach((o, idx) => {
      o.style.pointerEvents = 'none'
      o.classList.remove('is-selected', 'is-dim')
      o.classList.add(idx === i ? 'is-selected' : 'is-dim')
    })
  }

  // Collision mode: after you answer you're locked while the other team may still play.
  function setWaiting(on) {
    statusEl.style.display = on ? '' : 'none'
    if (on) statusEl.textContent = 'بانتظار الخصم…'
  }

  function reveal(selected, correct) {
    statusEl.style.display = 'none'
    optionEls.forEach((o, idx) => {
      o.style.pointerEvents = 'none'
      o.classList.remove('is-selected', 'is-dim', 'is-correct', 'is-wrong')
      if (idx === correct) o.classList.add('is-correct')
      else if (idx === selected) o.classList.add('is-wrong')
      else o.classList.add('is-dim')
    })
  }

  return { el, setTimer, markSelected, reveal, setWaiting }
}
