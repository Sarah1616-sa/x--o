import './ui/theme.css'
import { ScreenManager } from './ui/ScreenManager.js'
import { MainMenuScreen } from './ui/screens/MainMenuScreen.js'
import { GameScreen } from './ui/screens/GameScreen.js'
import { socketService } from './network/socketService.js'

const root = document.getElementById('app')
const nav = new ScreenManager(root)

// Open the realtime connection once at boot (autoConnect is off in socket.js).
// Safe if the server is down — the splash never reads socket state.
socketService.connect()

// #game opens a local hotseat game directly (also handy for verification).
if (window.location.hash === '#game') {
  nav.show(GameScreen, {})
} else {
  nav.show(MainMenuScreen)
}
