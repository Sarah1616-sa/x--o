/* ============================================================
   dom.js — tiny hyperscript + themed component factories.
   No framework. Every factory emits elements that wear the
   theme.css classes, so screens are composed, never hand-styled.
   ============================================================ */

/** Create an element. props: class/text/html/dataset/style/on<Event>/attrs. */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue
    if (key === 'class' || key === 'className') el.className = value
    else if (key === 'text') el.textContent = value
    else if (key === 'html') el.innerHTML = value
    else if (key === 'dataset') Object.assign(el.dataset, value)
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value)
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value)
    } else if (key === 'disabled' || key === 'checked' || key === 'value' || key === 'type') {
      el[key] = value
    } else {
      el.setAttribute(key, value)
    }
  }
  append(el, children)
  return el
}

function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)))
  }
}

export function mount(parent, ...children) {
  append(parent, children)
  return parent
}

export function clear(el) {
  while (el && el.firstChild) el.removeChild(el.firstChild)
  return el
}

/* ---------- shell ---------- */

/** The app screen column: optional top header, body (focal), single action footer. */
export function screen({ top, body, action, bodyClass = '', centered = false, cls = '' } = {}) {
  const parts = []
  if (top) parts.push(h('header', { class: 'screen__top' }, top))
  parts.push(h('section', { class: `screen__body ${centered ? 'center' : ''} ${bodyClass}`.trim() }, body))
  if (action) parts.push(h('footer', { class: 'screen__action' }, action))
  return h('main', { class: `screen ${cls}`.trim() }, ...parts)
}

export function logo({ variant = 'splash' } = {}) {
  const isTopbar = variant === 'topbar'
  return h('img', {
    // Splash uses the framed brand logo; everywhere else uses the cut-out mark.
    src: isTopbar ? '/xo-logo-mark.png' : '/xo-logo.png',
    alt: 'اكس او',
    class: isTopbar ? 'topbar__logo' : 'brand__logo',
  })
}

export function topbar(...children) {
  return h('div', { class: 'topbar' }, ...children)
}

/* ---------- buttons ---------- */

/**
 * Themed button. variant: primary (gold, the ONE action) | secondary (cream) |
 * danger (maroon) | ghost. Pick exactly one primary per screen.
 */
export function button(label, { variant = 'secondary', onClick, block = true, pill = false, sm = false, disabled = false, type = 'button', ...rest } = {}) {
  const cls = ['btn', `btn--${variant}`]
  if (block) cls.push('btn--block')
  if (pill) cls.push('btn--pill')
  if (sm) cls.push('btn--sm')
  return h('button', { class: cls.join(' '), type, disabled, onClick, ...rest }, label)
}

/* ---------- containers ---------- */

export function card(children, { lg = false, title } = {}) {
  const kids = []
  if (title) kids.push(h('h2', { class: 'card__title' }, title))
  kids.push(...(Array.isArray(children) ? children : [children]))
  return h('div', { class: lg ? 'card card--lg' : 'card' }, ...kids)
}

/* ---------- inputs ---------- */

export function field({ placeholder = '', value = '', maxlength, display = false, oninput, onkeydown, ...rest } = {}) {
  return h('input', {
    class: display ? 'field field--display' : 'field',
    type: 'text',
    placeholder,
    value,
    maxlength,
    oninput,
    onkeydown,
    autocomplete: 'off',
    ...rest,
  })
}

export function labeledField(labelText, opts = {}) {
  return h('label', { class: 'stack' }, h('span', { class: 'label' }, labelText), field(opts))
}

/* ---------- segmented control ---------- */

/** options: [{value, label}]; calls onChange(value) on tap. Returns {el, set}. */
export function segmented(options, { value, onChange } = {}) {
  let current = value
  const tabs = options.map((opt) =>
    h('div', {
      class: 'segmented__tab',
      role: 'tab',
      'aria-selected': String(opt.value === current),
      onClick: () => {
        if (opt.value === current) return
        current = opt.value
        tabs.forEach((t, i) => t.setAttribute('aria-selected', String(options[i].value === current)))
        onChange && onChange(current)
      },
    }, opt.label),
  )
  const el = h('div', { class: 'segmented', role: 'tablist' }, ...tabs)
  return {
    el,
    set(v) {
      current = v
      tabs.forEach((t, i) => t.setAttribute('aria-selected', String(options[i].value === current)))
    },
  }
}

/** Static switch. Returns {el, set, get}. */
export function switchToggle({ checked = false, onChange } = {}) {
  let on = checked
  const el = h('div', {
    class: 'switch',
    role: 'switch',
    'aria-checked': String(on),
    onClick: () => {
      on = !on
      el.setAttribute('aria-checked', String(on))
      onChange && onChange(on)
    },
  }, h('span', { class: 'switch__knob' }))
  return { el, set(v) { on = v; el.setAttribute('aria-checked', String(on)) }, get() { return on } }
}

/* ---------- badges + player chips ---------- */

export function badge(text, { variant } = {}) {
  const cls = variant ? `badge badge--${variant}` : 'badge'
  return h('span', { class: cls }, text)
}

/** mark: 'X' | 'O' | seat label. */
export function playerChip({ mark = '', name = '', team, isTurn = false } = {}) {
  const avatarCls = ['player__avatar']
  if (team === 'X') avatarCls.push('player__avatar--x')
  if (team === 'O') avatarCls.push('player__avatar--o')
  return h('div', { class: isTurn ? 'player is-turn' : 'player' },
    h('div', { class: avatarCls.join(' ') }, mark),
    name ? h('div', { class: 'player__name' }, name) : null,
  )
}

/* ---------- dialog ---------- */

/** A modal sheet over a scrim. Returns the scrim element; remove it to close. */
export function dialog({ title, message, body, actions = [] } = {}) {
  const inner = []
  if (title) inner.push(h('h3', null, title))
  if (message) inner.push(h('p', null, message))
  if (body) inner.push(body)
  if (actions.length) inner.push(h('div', { class: 'stack' }, ...actions))
  return h('div', { class: 'scrim' }, h('div', { class: 'dialog' }, ...inner))
}

/* ---------- transient toast ---------- */

let toastTimer = null
let toastEl = null
export function toast(message, { error = false, ms = 2600 } = {}) {
  if (toastEl) toastEl.remove()
  if (toastTimer) clearTimeout(toastTimer)
  toastEl = h('div', { class: error ? 'toast toast--error' : 'toast' }, message)
  document.body.append(toastEl)
  toastTimer = setTimeout(() => {
    if (toastEl) toastEl.remove()
    toastEl = null
  }, ms)
}
