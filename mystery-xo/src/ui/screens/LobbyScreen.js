/* ============================================================
   LobbyScreen — pre-game multiplayer lobby (full DOM/CSS rebuild).
   Two views inside one screen:
     ENTRY: name + create room / join by code
     ROOM:  share code, team rosters, ready, host settings, start
   Talks to the preserved socketService singleton. Re-renders the
   whole room view on every room broadcast (matches the original).
   One gold action per screen. Team colors are fixed brand X=red / O=gold.
   ============================================================ */
import { socketService } from '../../network/socketService.js'
import { SOCKET_EVENTS } from '../../network/socketEvents.js'
import { h, clear, screen, topbar, logo, button, field, badge, toast } from '../dom.js'

const DEFAULT_MAX_PLAYERS = 8

export function LobbyScreen(nav) {
  const root = h('div', { style: { display: 'contents' } })
  const unsubs = []
  const listen = (event, fn) => unsubs.push(socketService.on(event, fn))

  let room = socketService.getRoomSnapshot()
  let mode = 'create' // 'create' | 'join'
  const draft = { name: '', code: prefillCode() }

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

  /* -------------------- ROOM VIEW -------------------- */
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
          return h('div', { class: 'roster__row' },
            h('span', { class: 'roster__name' }, p.name + (isSelf ? ' (أنت)' : '')),
            h('span', { class: 'roster__badges' }, ...badges),
          )
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

  function hostSettings() {
    if (!isHost()) return null
    const current = room?.settings?.maxPlayers ?? DEFAULT_MAX_PLAYERS
    const minimum = Math.max(2, playerList().length)
    const valueEl = h('span', { class: 'stepper__value' }, String(current))
    const setMax = (next) => {
      const clamped = Math.max(minimum, Math.min(20, next))
      valueEl.textContent = String(clamped)
      socketService.updateSettings({ maxPlayers: clamped })
    }
    return h('div', { class: 'card stack', style: { gap: 'var(--s-3)' } },
      h('h2', { class: 'card__title', style: { fontSize: 'var(--fs-lead)' } }, 'إعدادات المضيف'),
      h('div', { class: 'row row--between' },
        h('span', { class: 'label', style: { margin: 0 } }, 'عدد اللاعبين الأقصى'),
        h('div', { class: 'stepper' },
          button('−', { variant: 'secondary', block: false, sm: true, onClick: () => setMax(current - 1) }),
          valueEl,
          button('+', { variant: 'secondary', block: false, sm: true, onClick: () => setMax(current + 1) }),
        ),
      ),
    )
  }

  function renderRoom() {
    const me = self()
    const readyCount = playerList().filter((p) => p.ready).length
    const total = playerList().length
    const host = isHost()

    const shareUrl = buildShareUrl(room.roomCode)
    const codeCard = h('div', { class: 'card center stack', style: { gap: 'var(--s-3)' } },
      h('span', { class: 'label', style: { margin: 0 } }, 'كود الغرفة'),
      h('div', { class: 'code-display selectable' }, room.roomCode || '------'),
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        button('نسخ الرابط', { variant: 'secondary', block: false, sm: true, onClick: () => copyLink(shareUrl) }),
        button('مشاركة', { variant: 'secondary', block: false, sm: true, onClick: () => shareRoom(shareUrl) }),
      ),
    )

    const teams = h('div', { class: 'teams' }, teamColumn('X'), teamColumn('O'))

    const joinRow = h('div', { class: 'row', style: { gap: 'var(--s-3)' } },
      button('انضم X', {
        variant: 'secondary',
        disabled: !me || me.team === 'X',
        onClick: () => socketService.setTeam('X'),
      }),
      button('انضم O', {
        variant: 'secondary',
        disabled: !me || me.team === 'O',
        onClick: () => socketService.setTeam('O'),
      }),
    )

    // one gold action: host -> start; non-host -> ready
    const readyBtn = button(me?.ready ? 'إلغاء الاستعداد' : 'أنا مستعد', {
      variant: host ? 'secondary' : 'primary',
      onClick: () => (me?.ready ? socketService.unready() : socketService.ready()),
    })
    const startBtn = host
      ? button('ابدأ المباراة', { variant: 'primary', onClick: () => socketService.startMatch() })
      : null

    const actions = h('div', { class: 'stack' },
      h('p', { class: 'roomhint' }, `${readyCount}/${total} مستعدون`),
      startBtn,
      readyBtn,
    )

    return screen({
      cls: 'screen--room',
      top: topbar(
        logo({ variant: 'topbar' }),
        h('h1', { class: 'topbar__title' }, 'الردهة'),
        h('span', { class: 'spacer' }),
        button('مغادرة', { variant: 'secondary', block: false, sm: true, pill: true, onClick: () => leave() }),
      ),
      body: h('div', { class: 'scroll-region stack', style: { gap: 'var(--s-4)' } },
        codeCard,
        teams,
        joinRow,
        hostSettings(),
      ),
      action: actions,
    })
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
  function render() {
    clear(root)
    root.append(room && room.roomCode ? renderRoom() : renderEntry())
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
