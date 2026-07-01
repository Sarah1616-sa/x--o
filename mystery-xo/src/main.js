import './ui/theme.css'
import { ScreenManager } from './ui/ScreenManager.js'
import { socketService } from './network/socketService.js'

const root = document.getElementById('app')
const nav = new ScreenManager(root)

// Open the realtime connection once at boot (autoConnect is off in socket.js).
// Safe if the server is down — the splash never reads socket state.
socketService.connect()

// Route from the URL/session: a reloaded page rejoins its room; otherwise the main menu.
nav.boot()
