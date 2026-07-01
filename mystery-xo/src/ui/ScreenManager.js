/* ============================================================
   ScreenManager — the DOM screen router that replaces Phaser's
   scene state machine. A screen is a factory:
     (nav, props) => { el, mounted?(), destroy?() }
   nav.show(Factory, props) tears down the current screen and
   mounts the next. No animation — screens swap instantly.
   ============================================================ */
import { clear } from './dom.js'
import { socketService } from '../network/socketService.js'

// If a rejoin ack never comes (server unreachable), fall back to the menu instead of
// hanging on a blank screen.
const REJOIN_TIMEOUT_MS = 8000

export class ScreenManager {
  constructor(root) {
    this.root = root
    this.current = null
  }

  show(factory, props = {}) {
    if (this.current && typeof this.current.destroy === 'function') {
      this.current.destroy()
    }
    clear(this.root)
    const screen = factory(this, props)
    this.current = screen
    if (screen && screen.el) this.root.append(screen.el)
    if (screen && typeof screen.mounted === 'function') screen.mounted()
    return screen
  }

  // Entry point at boot. A reloaded page carries a persisted session (sessionStorage +
  // #/room/CODE), so try to rejoin that room first and land straight in the live game or
  // lobby. Otherwise (or if the token is stale) show the main menu as usual.
  async boot() {
    if (socketService.hasSavedSession()) {
      try {
        await Promise.race([
          socketService.rejoin(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Rejoin timed out.')), REJOIN_TIMEOUT_MS)),
        ])

        if (socketService.isMultiplayerActive()) {
          const { GameScreen } = await import('./screens/GameScreen.js')
          this.show(GameScreen, { room: socketService.getRoomSnapshot() })
        } else {
          const { LobbyScreen } = await import('./screens/LobbyScreen.js')
          this.show(LobbyScreen)
        }
        return
      } catch {
        // Stale/expired session (rejoin() already cleared it) or timeout — fall to menu.
      }
    }

    const { MainMenuScreen } = await import('./screens/MainMenuScreen.js')
    this.show(MainMenuScreen)
  }
}
