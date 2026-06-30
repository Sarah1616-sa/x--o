/* ============================================================
   MainMenuScreen — the home splash.
   One focal thing (the logo) + one gold action ("العب" / Play).
   ============================================================ */
import { screen, logo, button, h } from '../dom.js'
import { LobbyScreen } from './LobbyScreen.js'

export function MainMenuScreen(nav) {
  const el = screen({
    centered: true,
    body: h('div', { class: 'brand' },
      logo({ variant: 'splash' }),
      h('p', { class: 'brand__tagline' }, 'إكس أو الجماعية — العب مع أصدقائك'),
    ),
    action: button('العب', {
      variant: 'primary',
      onClick: () => nav.show(LobbyScreen),
    }),
  })

  return { el }
}
