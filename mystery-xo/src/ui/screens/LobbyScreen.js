/* ============================================================
   LobbyScreen — pre-game multiplayer lobby.
   Two views inside one screen:
     ENTRY: name + create room / join by code
     ROOM:  share code, team rosters, ready, host settings, start
   Talks to the preserved socketService singleton. The ROOM view is
   built ONCE into a persistent shell (topbar+logo, scroll-region,
   footer) and PATCHED IN PLACE on every room broadcast — mirroring
   GameScreen's { el, update } components — so the logo never flashes
   and the scroll position is preserved (no snap-to-top on mobile).
   One gold action per screen. Team colors are fixed brand X=red / O=gold.
   ============================================================ */
import { socketService } from '../../network/socketService.js'
import { SOCKET_EVENTS } from '../../network/socketEvents.js'
import { CATEGORIES } from '../../game/data/questions/index.js'
import { h, clear, screen, topbar, logo, button, field, badge, toast } from '../dom.js'

const DEFAULT_MAX_PLAYERS = 8
const DEFAULT_ROUNDS = 3
const MAX_PLAYERS_CAP = 10
const MAX_ROUNDS = 5
const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))
const categoryLabel = (id) => {
  const c = CATEGORY_BY_ID.get(id)
  return c ? `${c.emoji} ${c.label}` : id
}

export function LobbyScreen(nav) {
  const root = h('div', { style: { display: 'contents' } })
  const unsubs = []
  const listen = (event, fn) => unsubs.push(socketService.on(event, fn))

  let room = socketService.getRoomSnapshot()
  let mode = 'create' // 'create' | 'join'
  const draft = { name: '', code: prefillCode() }

  // Persistent room view ({ el, update }), built once when we enter a room.
  // While it exists, room broadcasts patch it in place instead of rebuilding.
  let roomView = null

  function prefillCode() {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('room')
    return code ? code.trim().toUpperCase() : ''
  }

  /* -------------------- ENTRY VIEW -------------------- */
  function renderEntry() {
    const nameInput = field({
      placeholder: 'أدخل اسمك',
      value: draft.name,
      maxlength: 24,
      oninput: (e) => { draft.name = e.target.value },
    })

    const codeInput = field({
      placeholder: 'كود الغرفة',
      value: draft.code,
      maxlength: 6,
      display: true,
      style: { textTransform: 'uppercase', letterSpacing: '0.3em', textAlign: 'center' },
      oninput: (e) => { draft.code = e.target.value.toUpperCase() },
    })

    const createBtn = button('إنشاء غرفة', { variant: 'primary', onClick: submitCreate })
    const joinBtn = button('انضمام لغرفة', { variant: 'secondary', onClick: submitJoin })

    const formCard = h('div', { class: 'card card--lg stack', style: { gap: 'var(--s-4)' } },
      h('label', { class: 'stack' }, h('span', { class: 'label' }, 'اسمك'), nameInput),
      createBtn,
      h('div', { class: 'or-divider' }, h('span', null, 'أو')),
      codeInput,
      joinBtn,
    )

    return screen({
      top: topbar(
        logo({ variant: 'topbar' }),
        h('h1', { class: 'topbar__title' }, 'اكس او'),
        h('span', { class: 'spacer' }),
        button('رجوع', { variant: 'secondary', block: false, sm: true, pill: true, onClick: () => goMainMenu() }),
      ),
      bodyClass: '',
      body: formCard,
    })
  }

  async function submitCreate() {
    if (!draft.name.trim()) return toast('أدخل اسمك أولاً', { error: true })
    try {
      await socketService.createRoom(draft.name.trim(), DEFAULT_MAX_PLAYERS)
    } catch (err) {
      toast(err?.message ?? 'تعذّر إنشاء الغرفة', { error: true })
    }
  }

  async function submitJoin() {
    if (!draft.name.trim()) return toast('أدخل اسمك أولاً', { error: true })
    if (!draft.code.trim()) return toast('أدخل كود الغرفة', { error: true })
    try {
      await socketService.joinRoom(draft.code.trim().toUpperCase(), draft.name.trim())
    } catch (err) {
      toast(err?.message ?? 'تعذّر الانضمام', { error: true })
    }
  }

  /* -------------------- ROOM: shared readers -------------------- */
  function selfId() {
    return socketService.getSelfPlayerId()
  }
  function playerList() {
    return room && room.players ? Object.values(room.players) : []
  }
  function self() {
    return room && room.players ? room.players[selfId()] : null
  }
  function isHost() {
    return room && room.hostPlayerId === selfId()
  }

  function teamColumn(teamKey) {
    const members = playerList().filter((p) => p.team === teamKey)
    const rows = members.length
      ? members.map((p) => {
          const badges = []
          if (p.isHost) badges.push(badge('مضيف', { variant: 'cream' }))
          if (p.ready) badges.push(badge('مستعد', { variant: 'ok' }))
          if (!p.connected) badges.push(badge('غير متصل', { variant: 'cream' }))
          const isSelf = p.playerId === selfId()
          const line = h('div', { class: 'roster__line' },
            h('span', { class: 'roster__name' }, p.name + (isSelf ? ' (أنت)' : '')),
            h('span', { class: 'roster__badges' }, ...badges),
          )
          // Everyone sees every player's category picks live (read-only, from snapshot).
          const cats = p.selectedCategories?.length
            ? h('div', { class: 'cat-tags' }, ...p.selectedCategories.map((id) => h('span', { class: 'cat-tag' }, categoryLabel(id))))
            : null
          return h('div', { class: `roster__row${cats ? ' roster__row--stack' : ''}` }, line, cats)
        })
      : [h('div', { class: 'roster__row roster__row--empty' }, 'لا يوجد لاعبون')]

    return h('div', { class: `roster roster--${teamKey.toLowerCase()}` },
      h('div', { class: 'roster__head' },
        h('span', { class: `roster__mark roster__mark--${teamKey.toLowerCase()}` }, teamKey),
        h('span', { class: 'roster__title' }, teamKey === 'X' ? 'الفريق X' : 'الفريق O'),
        h('span', { class: 'roster__count' }, String(members.length)),
      ),
      ...rows,
    )
  }

  // One settings row: host gets a −/value/+ stepper; everyone else sees the value
  // read-only. Server is authoritative — it re-validates and rejects non-host changes.
  function stepperRow(label, { value, min, max, editable, onChange }) {
    if (!editable) {
      return h('div', { class: 'row row--between' },
        h('span', { class: 'label', style: { margin: 0 } }, label),
        h('span', { class: 'stepper__value' }, String(value)),
      )
    }
    const valueEl = h('span', { class: 'stepper__value' }, String(value))
    const set = (next) => {
      const clamped = Math.max(min, Math.min(max, next))
      valueEl.textContent = String(clamped)
      onChange(clamped)
    }
    return h('div', { class: 'row row--between' },
      h('span', { class: 'label', style: { margin: 0 } }, label),
      h('div', { class: 'stepper' },
        button('−', { variant: 'secondary', block: false, sm: true, onClick: () => set(value - 1) }),
        valueEl,
        button('+', { variant: 'secondary', block: false, sm: true, onClick: () => set(value + 1) }),
      ),
    )
  }

  /* -------------------- ROOM: build-once { el, update } components -------------------- */

  // Room code + share/copy. Code is stable within a room; update() refreshes text + share URL.
  function CodeCard() {
    const codeEl = h('div', { class: 'code-display selectable' }, '------')
    let url = ''
    const el = h('div', { class: 'card center stack', style: { gap: 'var(--s-3)' } },
      h('span', { class: 'label', style: { margin: 0 } }, 'كود الغرفة'),
      codeEl,
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        button('نسخ الرابط', { variant: 'secondary', block: false, sm: true, onClick: () => copyLink(url) }),
        button('مشاركة', { variant: 'secondary', block: false, sm: true, onClick: () => shareRoom(url) }),
      ),
    )
    return {
      el,
      update() {
        codeEl.textContent = room?.roomCode || '------'
        url = room?.roomCode ? buildShareUrl(room.roomCode) : ''
      },
    }
  }

  // Every player picks their OWN categories (multi-select). Chips are built once;
  // update() toggles the selected class/aria in place — no rebuild, so tapping a chip
  // never resets scroll or reloads the logo. Selections stay snapshot-driven.
  function CategoryPicker() {
    const chipById = new Map()
    const chips = CATEGORIES.map((cat) => {
      const chip = h('button', {
        class: 'cat-chip',
        type: 'button',
        'aria-pressed': 'false',
        onClick: () => {
          const next = new Set(self()?.selectedCategories ?? [])
          if (next.has(cat.id)) next.delete(cat.id)
          else next.add(cat.id)
          socketService.setCategories([...next])
        },
      }, `${cat.emoji} ${cat.label}`)
      chipById.set(cat.id, chip)
      return chip
    })
    const el = h('div', { class: 'card cat-card stack', style: { gap: 'var(--s-3)' } },
      h('h2', { class: 'card__title', style: { fontSize: 'var(--fs-lead)' } }, 'فئات الأسئلة'),
      h('span', { class: 'label', style: { margin: 0 } }, 'اختر فئاتك — تُجمع اختيارات كل اللاعبين'),
      h('div', { class: 'cat-picker' }, ...chips),
    )
    return {
      el,
      update() {
        const selected = new Set(self()?.selectedCategories ?? [])
        chipById.forEach((chip, id) => {
          const on = selected.has(id)
          chip.classList.toggle('is-selected', on)
          chip.setAttribute('aria-pressed', on ? 'true' : 'false')
        })
      },
    }
  }

  // Team-join buttons; built once, update() only toggles disabled by my current team.
  function JoinRow() {
    const xBtn = button('انضم X', { variant: 'secondary', onClick: () => socketService.setTeam('X') })
    const oBtn = button('انضم O', { variant: 'secondary', onClick: () => socketService.setTeam('O') })
    const el = h('div', { class: 'row', style: { gap: 'var(--s-3)' } }, xBtn, oBtn)
    return {
      el,
      update() {
        const me = self()
        xBtn.disabled = !me || me.team === 'X'
        oBtn.disabled = !me || me.team === 'O'
      },
    }
  }

  // Team rosters vary in length; keep the persistent .teams container and refill only
  // its subtree on update (a localized swap that leaves the scroll-region + logo intact).
  function TeamRosters() {
    const el = h('div', { class: 'teams' })
    return {
      el,
      update() {
        clear(el)
        el.append(teamColumn('X'), teamColumn('O'))
      },
    }
  }

  // Host settings toggle between read-only values and −/+ steppers by host-ness, so
  // refill the card subtree on update. Reuses stepperRow(); .card class keeps the desktop grid.
  function HostSettings() {
    const el = h('div', { class: 'card stack', style: { gap: 'var(--s-3)' } })
    return {
      el,
      update() {
        const editable = isHost()
        const settings = room?.settings || {}
        const rounds = settings.stageCount ?? DEFAULT_ROUNDS
        const maxPlayers = settings.maxPlayers ?? DEFAULT_MAX_PLAYERS
        // can't cap below the players already in the room
        const minPlayers = Math.max(2, playerList().length)
        clear(el)
        el.append(
          h('h2', { class: 'card__title', style: { fontSize: 'var(--fs-lead)' } }, 'إعدادات المضيف'),
          stepperRow('عدد الجولات', {
            value: rounds, min: 1, max: MAX_ROUNDS, editable,
            onChange: (v) => socketService.updateSettings({ stageCount: v }),
          }),
          stepperRow('عدد اللاعبين الأقصى', {
            value: maxPlayers, min: minPlayers, max: MAX_PLAYERS_CAP, editable,
            onChange: (v) => socketService.updateSettings({ maxPlayers: v }),
          }),
        )
      },
    }
  }

  // Footer: ready hint + "pick a category" nudge + the single gold Ready action.
  // The match auto-starts when everyone is ready and at least one category is chosen
  // overall, so Ready is the SINGLE gold action for every player.
  function ReadyActions() {
    const hint = h('p', { class: 'roomhint' }, '')
    const catHint = h('p', { class: 'roomhint' }, 'اختر فئة واحدة على الأقل للبدء')
    const readyBtn = button('أنا مستعد', {
      variant: 'primary',
      onClick: () => (self()?.ready ? socketService.unready() : socketService.ready()),
    })
    const el = h('div', { class: 'stack' }, hint, catHint, readyBtn)
    return {
      el,
      update() {
        const me = self()
        const readyCount = playerList().filter((p) => p.ready).length
        const total = playerList().length
        const anyCategory = playerList().some((p) => p.selectedCategories?.length)
        hint.textContent = `${readyCount}/${total} مستعدون`
        catHint.style.display = anyCategory ? 'none' : ''
        readyBtn.textContent = me?.ready ? 'إلغاء الاستعداد' : 'أنا مستعد'
      },
    }
  }

  // Assemble the room view ONCE: persistent topbar (logo built here, never recreated),
  // a persistent scroll-region body, and a persistent footer. update() patches the parts.
  function buildRoomView() {
    const code = CodeCard()
    const cats = CategoryPicker()
    const rosters = TeamRosters()
    const join = JoinRow()
    const settings = HostSettings()
    const actions = ReadyActions()

    const el = screen({
      cls: 'screen--room',
      top: topbar(
        logo({ variant: 'topbar' }),
        h('h1', { class: 'topbar__title' }, 'الردهة'),
        h('span', { class: 'spacer' }),
        button('مغادرة', { variant: 'secondary', block: false, sm: true, pill: true, onClick: () => leave() }),
      ),
      body: h('div', { class: 'scroll-region stack', style: { gap: 'var(--s-4)' } },
        code.el,
        cats.el,
        rosters.el,
        join.el,
        settings.el,
      ),
      action: actions.el,
    })

    function update() {
      code.update()
      cats.update()
      rosters.update()
      join.update()
      settings.update()
      actions.update()
    }

    return { el, update }
  }

  /* -------------------- actions -------------------- */
  function buildShareUrl(code) {
    const url = new URL(window.location.origin + window.location.pathname)
    url.searchParams.set('room', code)
    return url.toString()
  }
  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url)
      toast('تم نسخ الرابط')
    } catch {
      toast('انسخ الرابط يدوياً', { error: true })
    }
  }
  async function shareRoom(url) {
    if (navigator.share) {
      try { await navigator.share({ title: 'اكس او', text: 'انضم إلى غرفتي', url }) } catch { /* cancelled */ }
    } else {
      copyLink(url)
    }
  }
  function leave() {
    socketService.leaveRoom()
    room = null
    render()
  }
  function goMainMenu() {
    import('./MainMenuScreen.js').then((m) => nav.show(m.MainMenuScreen))
  }

  /* -------------------- render + wiring -------------------- */
  // In a room: build the persistent view once, then PATCH it on every broadcast
  // (preserves scroll + logo). Otherwise show the entry view. Only entry<->room
  // transitions clear the root.
  function render() {
    if (room && room.roomCode) {
      if (!roomView) {
        clear(root)
        roomView = buildRoomView()
        root.append(roomView.el)
      }
      roomView.update()
    } else {
      roomView = null
      clear(root)
      root.append(renderEntry())
    }
  }

  listen(SOCKET_EVENTS.ROOM_CREATED, (p) => { room = p.room ?? socketService.getRoomSnapshot(); render() })
  listen(SOCKET_EVENTS.ROOM_JOINED, (p) => { room = p.room ?? socketService.getRoomSnapshot(); render() })
  listen(SOCKET_EVENTS.ROOM_UPDATE, (p) => { room = p.room ?? socketService.getRoomSnapshot(); render() })
  listen(SOCKET_EVENTS.HOST_CHANGED, (p) => { if (p?.room) room = p.room; render() })
  listen(SOCKET_EVENTS.ROOM_ERROR, (p) => toast(p?.message ?? 'خطأ في الغرفة', { error: true }))
  listen('action:error', (p) => toast(p?.message ?? 'خطأ', { error: true }))
  listen(SOCKET_EVENTS.MATCH_STARTING, (p) => {
    if (p?.room) room = p.room
    import('./GameScreen.js').then((m) => nav.show(m.GameScreen, { room }))
  })

  if (draft.code) toast(`الغرفة ${draft.code} جاهزة — أدخل اسمك واضغط انضمام`)
  render()

  return {
    el: root,
    destroy() { unsubs.forEach((u) => u()) },
  }
}
