export class MatchEndUI {
  constructor(scene) {
    this.scene = scene
    this.overlay = null
  }

  show({ winner, stageScores, onPlayAgain, onReturnToMenu, width, height }) {
    this.hide()

    const overlay = this.scene.add.container(0, 0).setDepth(100)
    const dim = this.scene.add.rectangle(0, 0, 1, 1, 0x000000, 0.72).setOrigin(0).setInteractive()
    const panel = this.scene.add.graphics()
    const title = this.scene.add
      .text(0, 0, 'انتهت المباراة', {
        color: '#ff3355',
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)
    const winnerLabel = this.scene.add
      .text(0, 0, winner ? `الفائز: الفريق ${winner}` : 'الفائز: تعادل', {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)
    const scoreLabel = this.scene.add
      .text(0, 0, `النتيجة النهائية: X ${stageScores.X} - ${stageScores.O} O`, {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)
    const playAgainButton = this.createButton('Play Again', onPlayAgain)
    const menuButton = this.createButton('Return to Main Menu', onReturnToMenu)

    overlay.add([dim, panel, title, winnerLabel, scoreLabel, playAgainButton, menuButton])
    overlay.dim = dim
    overlay.panel = panel
    overlay.title = title
    overlay.winnerLabel = winnerLabel
    overlay.scoreLabel = scoreLabel
    overlay.playAgainButton = playAgainButton
    overlay.menuButton = menuButton

    this.overlay = overlay
    this.layout(width, height)
  }

  createButton(labelText, onClick) {
    const button = this.scene.add.container(0, 0)
    const background = this.scene.add
      .rectangle(0, 0, 260, 44, 0x111827, 1)
      .setStrokeStyle(1, 0xff3355, 0.9)
      .setInteractive({ useHandCursor: true })
    const label = this.scene.add
      .text(0, 0, labelText, {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        align: 'center',
      })
      .setOrigin(0.5)

    background.on('pointerdown', onClick)
    button.add([background, label])

    return button
  }

  layout(width, height) {
    if (!this.overlay) {
      return
    }

    const panelWidth = Math.min(560, width * 0.86)
    const panelHeight = 350
    const panelX = width / 2
    const panelY = height / 2
    const overlay = this.overlay

    overlay.dim.setSize(width, height)
    overlay.panel.clear()
    overlay.panel.fillStyle(0x070b14, 0.97)
    overlay.panel.fillRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 12)
    overlay.panel.lineStyle(2, 0xff3355, 0.9)
    overlay.panel.strokeRoundedRect(panelX - panelWidth / 2 + 1, panelY - panelHeight / 2 + 1, panelWidth - 2, panelHeight - 2, 12)
    overlay.panel.lineStyle(1, 0xffffff, 0.12)
    overlay.panel.strokeRoundedRect(panelX - panelWidth / 2 + 10, panelY - panelHeight / 2 + 10, panelWidth - 20, panelHeight - 20, 8)
    overlay.title.setPosition(panelX, panelY - 112)
    overlay.winnerLabel.setPosition(panelX, panelY - 54)
    overlay.scoreLabel.setPosition(panelX, panelY - 14)
    overlay.playAgainButton.setPosition(panelX, panelY + 68)
    overlay.menuButton.setPosition(panelX, panelY + 126)
  }

  hide() {
    if (!this.overlay) {
      return
    }

    this.overlay.destroy()
    this.overlay = null
  }
}
