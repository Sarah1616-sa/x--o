import Phaser from 'phaser'
import { socketService } from '../../network/socketService.js'
import { SOCKET_EVENTS } from '../../network/socketEvents.js'

const DEFAULT_MAX_PLAYERS = 4

export class LobbyScene extends Phaser.Scene {
  constructor() {
    super('LobbyScene')
    this.unsubscribers = []
    this.lobbyEl = null
  }

  create() {
    socketService.connect()

    this.backgroundGraphics = this.add.graphics().setDepth(0)
    this.panelGraphics = this.add.graphics().setDepth(1)

    this.title = this.add
      .text(0, 0, 'Mystery XO Lobby', {
        color: '#ff3355',
        fontFamily: 'Arial, sans-serif',
        fontSize: '42px',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2)

    this.subtitle = this.add
      .text(0, 0, 'Connect to the backend lobby', {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2)

    this.statusText = this.add
      .text(0, 0, 'Ready', {
        color: '#cbd5e1',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
      })
      .setOrigin(0, 0)
      .setDepth(2)

    this.snapshotText = this.add
      .text(0, 0, 'Room snapshot will appear here.', {
        color: '#e5e7eb',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        wordWrap: { width: 360 },
      })
      .setOrigin(0, 0)
      .setDepth(2)

    this.createHtmlLobby()
    this.layout()
    this.bindSocketEvents()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this)
    this.scale.on('resize', this.layout, this)
  }

  createHtmlLobby() {
    this.lobbyEl = document.createElement('div')
    this.lobbyEl.id = 'mxo-lobby-form'

    this.lobbyEl.innerHTML = `
      <div class="mxo-lobby-card">
        <div class="mxo-field">
          <label class="mxo-label">Player Name</label>
          <input class="mxo-input" id="playerName" maxlength="24" placeholder="Enter name" value="Player" />
        </div>

        <div class="mxo-field">
          <label class="mxo-label">Room Code</label>
          <input class="mxo-input" id="roomCode" maxlength="6" placeholder="Join code" />
        </div>

        <div class="mxo-field">
          <label class="mxo-label">Max Players</label>
          <select class="mxo-select" id="maxPlayers">
            <option value="2">2</option>
            <option value="4" selected>4</option>
            <option value="6">6</option>
            <option value="8">8</option>
          </select>
        </div>

        <div class="mxo-row">
          <button class="mxo-button" id="createRoom" type="button">Create Room</button>
          <button class="mxo-button" id="joinRoom" type="button">Join Room</button>
        </div>

        <div class="mxo-divider"></div>

        <div class="mxo-row">
          <button class="mxo-button" id="ready" type="button">Ready</button>
          <button class="mxo-button" id="unready" type="button">Unready</button>
          <button class="mxo-button" id="startMatch" type="button">Start Match</button>
        </div>

        <div class="mxo-divider"></div>

        <div class="mxo-meta" id="summary">No room joined yet.</div>
        <div class="mxo-players" id="players"></div>
      </div>
    `

    const style = document.createElement('style')
    style.id = 'mxo-lobby-style'
    style.textContent = `
      #mxo-lobby-form {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -42%);
        z-index: 999999;
        pointer-events: auto;
      }

      #mxo-lobby-form * {
        pointer-events: auto;
        box-sizing: border-box;
      }

      .mxo-lobby-card {
        width: 420px;
        padding: 18px;
        border-radius: 14px;
        background: rgba(7, 11, 20, 0.97);
        border: 1px solid rgba(255, 51, 85, 0.85);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
        color: #fff;
        font-family: Arial, sans-serif;
      }

      .mxo-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 12px;
      }

      .mxo-label {
        font-size: 13px;
        color: #cbd5e1;
      }

      .mxo-input,
      .mxo-select {
        width: 100%;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid rgba(148, 163, 184, 0.45);
        background: #0b1220;
        color: #fff;
        outline: none;
      }

      .mxo-input:focus,
      .mxo-select:focus {
        border-color: #ff3355;
      }

      .mxo-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .mxo-button {
        padding: 10px 14px;
        border-radius: 10px;
        border: 1px solid rgba(255, 51, 85, 0.95);
        background: #111827;
        color: #fff;
        cursor: pointer;
        font-size: 14px;
      }

      .mxo-button:hover {
        background: #1f2937;
      }

      .mxo-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .mxo-divider {
        height: 1px;
        background: rgba(255,255,255,0.12);
        margin: 14px 0;
      }

      .mxo-meta {
        font-size: 13px;
        color: #e2e8f0;
        line-height: 1.5;
      }

      .mxo-players {
        margin-top: 10px;
        padding: 10px;
        background: rgba(15, 23, 42, 0.7);
        border-radius: 10px;
        min-height: 32px;
      }

      .mxo-player {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 4px 0;
        font-size: 13px;
        color: #e5e7eb;
      }

      .mxo-team-title {
        margin-top: 8px;
        font-weight: bold;
        color: #ff3355;
      }
    `

    document.head.appendChild(style)
    document.body.appendChild(this.lobbyEl)

    const byId = (id) => this.lobbyEl.querySelector(`#${id}`)

    byId('createRoom').addEventListener('click', () => {
      console.log('Create Room clicked')
      this.submitCreateRoom()
    })

    byId('joinRoom').addEventListener('click', () => {
      console.log('Join Room clicked')
      this.submitJoinRoom()
    })

    byId('ready').addEventListener('click', () => {
      console.log('Ready clicked')
      socketService.ready()
    })

    byId('unready').addEventListener('click', () => {
      console.log('Unready clicked')
      socketService.unready()
    })

    byId('startMatch').addEventListener('click', () => {
      console.log('Start Match clicked')
      socketService.startMatch()
    })

    this.formRefs = {
      container: this.lobbyEl,
      playerName: byId('playerName'),
      roomCode: byId('roomCode'),
      maxPlayers: byId('maxPlayers'),
      summary: byId('summary'),
      players: byId('players'),
      startMatch: byId('startMatch'),
    }
  }

  bindSocketEvents() {
    this.listen(SOCKET_EVENTS.ROOM_CREATED, (payload) => {
      this.updateStatus('Room created.')
      this.renderRoom(payload.room)
    })

    this.listen(SOCKET_EVENTS.ROOM_JOINED, (payload) => {
      this.updateStatus('Room joined.')
      this.renderRoom(payload.room)
    })

    this.listen(SOCKET_EVENTS.ROOM_UPDATE, (payload) => {
      this.renderRoom(payload.room)
    })

    this.listen(SOCKET_EVENTS.ROOM_ERROR, (payload) => {
      this.updateStatus(payload?.message ?? 'Room error')
    })

    this.listen(SOCKET_EVENTS.HOST_CHANGED, (payload) => {
      this.updateStatus(`New host: ${payload.hostPlayerName ?? 'Unknown'}`)
      if (payload.room) {
        this.renderRoom(payload.room)
      }
    })

    this.listen(SOCKET_EVENTS.MATCH_STARTING, (payload) => {
      if (payload.room) {
        this.renderRoom(payload.room)
      }

      this.updateStatus('Match starting...')
      this.scene.start('GameScene')
    })

    this.listen('action:error', (payload) => {
      this.updateStatus(payload?.message ?? 'Action error')
    })
  }

  listen(event, handler) {
    const unsubscribe = socketService.on(event, handler)
    this.unsubscribers.push(unsubscribe)
  }

  submitCreateRoom() {
    const playerName = this.formRefs.playerName.value.trim()
    const maxPlayers = Number(this.formRefs.maxPlayers.value || DEFAULT_MAX_PLAYERS)

    socketService
      .createRoom(playerName, maxPlayers)
      .catch((error) => this.updateStatus(error.message))
  }

  submitJoinRoom() {
    const playerName = this.formRefs.playerName.value.trim()
    const roomCode = this.formRefs.roomCode.value.trim()

    socketService
      .joinRoom(roomCode, playerName)
      .catch((error) => this.updateStatus(error.message))
  }

  updateStatus(message) {
    this.statusText.setText(message)
  }

  renderRoom(room) {
    const snapshot = room ?? socketService.getRoomSnapshot()

    if (!snapshot) {
      this.formRefs.summary.textContent = 'No room joined yet.'
      this.formRefs.players.innerHTML = ''
      return
    }

    const selfPlayerId = socketService.getSelfPlayerId()
    const players = Object.values(snapshot.players ?? {})

    this.formRefs.summary.innerHTML = `
      <div><strong>Room:</strong> ${snapshot.roomCode ?? '-'}</div>
      <div><strong>Host:</strong> ${snapshot.hostPlayerName ?? '-'}</div>
      <div><strong>Phase:</strong> ${snapshot.phase ?? '-'}</div>
      <div><strong>Ready:</strong> ${players.filter((player) => player.ready).length}/${players.length}</div>
    `

    const teamMarkup = ['X', 'O']
      .map((teamKey) => {
        const teamPlayers = players.filter((player) => player.team === teamKey)

        return `
          <div class="mxo-team-title">Team ${teamKey}</div>
          ${
            teamPlayers.length === 0
              ? '<div class="mxo-player"><span>No players</span><span></span></div>'
              : teamPlayers
                  .map(
                    (player) => `
                      <div class="mxo-player">
                        <span>${player.name}${player.playerId === selfPlayerId ? ' (you)' : ''}</span>
                        <span>${player.isHost ? 'Host' : ''} ${player.ready ? 'Ready' : 'Not Ready'} ${player.connected ? '' : 'Offline'}</span>
                      </div>
                    `,
                  )
                  .join('')
          }
        `
      })
      .join('')

    this.formRefs.players.innerHTML = teamMarkup
    this.formRefs.startMatch.disabled = snapshot.hostPlayerId !== selfPlayerId
  }

  layout() {
    const { width, height } = this.scale
    const panelWidth = Math.min(980, width * 0.9)
    const panelHeight = Math.min(760, height * 0.86)
    const panelX = width / 2 - panelWidth / 2
    const panelY = height / 2 - panelHeight / 2

    this.drawBackground(width, height)

    this.panelGraphics.clear()
    this.panelGraphics.fillStyle(0x070b14, 0.95)
    this.panelGraphics.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 14)
    this.panelGraphics.lineStyle(2, 0xff3355, 0.85)
    this.panelGraphics.strokeRoundedRect(panelX + 1, panelY + 1, panelWidth - 2, panelHeight - 2, 14)

    this.title.setPosition(width / 2, panelY + 44)
    this.subtitle.setPosition(width / 2, panelY + 86)
    this.statusText.setPosition(panelX + 20, panelY + panelHeight - 42)
    this.snapshotText.setPosition(panelX + panelWidth - 380, panelY + 120)
  }

  drawBackground(width, height) {
    this.backgroundGraphics.clear()

    const bands = 24

    for (let band = 0; band < bands; band += 1) {
      const progress = band / (bands - 1)
      const red = Phaser.Math.Linear(6, 18, progress)
      const green = Phaser.Math.Linear(7, 13, progress)
      const blue = Phaser.Math.Linear(18, 34, progress)
      const color = Phaser.Display.Color.GetColor(red, green, blue)
      const bandY = (height / bands) * band

      this.backgroundGraphics.fillStyle(color, 1)
      this.backgroundGraphics.fillRect(0, bandY, width, height / bands + 1)
    }
  }

  cleanup() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe())
    this.unsubscribers = []

    this.scale.off('resize', this.layout, this)

    if (this.lobbyEl) {
      this.lobbyEl.remove()
      this.lobbyEl = null
    }

    const style = document.getElementById('mxo-lobby-style')
    if (style) {
      style.remove()
    }
  }
}