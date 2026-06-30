/* ============================================================
   ScreenManager — the DOM screen router that replaces Phaser's
   scene state machine. A screen is a factory:
     (nav, props) => { el, mounted?(), destroy?() }
   nav.show(Factory, props) tears down the current screen and
   mounts the next. No animation — screens swap instantly.
   ============================================================ */
import { clear } from './dom.js'

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
}
