import './ui/theme.css'
import { ScreenManager } from './ui/ScreenManager.js'
import { MainMenuScreen } from './ui/screens/MainMenuScreen.js'
import { socketService } from './network/socketService.js'

const root = document.getElementById('app')
const nav = new ScreenManager(root)

// Open the realtime connection once at boot (autoConnect is off in socket.js).
// Safe if the server is down — the splash never reads socket state.
socketService.connect()

nav.show(MainMenuScreen)
