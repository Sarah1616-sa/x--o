import Phaser from 'phaser'

export class MainMenu extends Phaser.Scene {
  constructor() {
    super('MainMenu')
  }

  create() {
    this.backgroundGraphics = this.add.graphics().setDepth(0)
    this.menuPanel = this.add.graphics().setDepth(1)
    this.title = this.add
      .text(0, 0, 'Mystery XO', {
        color: '#ff3355',
        fontFamily: 'Arial, sans-serif',
        fontSize: '54px',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setShadow(0, 0, '#ff003c', 16, true, true)
    this.subtitle = this.add
      .text(0, 0, 'لعبة الغموض XO', {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)
      .setDepth(2)
    this.startButton = this.createMenuButton('Start Game', () => {
      this.scene.start('GameScene')
    })

    this.layoutMenu()
    this.scale.on('resize', this.layoutMenu, this)
  }

  createMenuButton(labelText, onClick) {
    const button = this.add.container(0, 0).setDepth(2)
    const background = this.add
      .rectangle(0, 0, 260, 48, 0x111827, 1)
      .setStrokeStyle(1, 0xff3355, 0.9)
      .setInteractive({ useHandCursor: true })
    const label = this.add
      .text(0, 0, labelText, {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        align: 'center',
      })
      .setOrigin(0.5)

    background.on('pointerdown', onClick)
    background.on('pointerover', () => {
      background.setFillStyle(0x1f2937, 1)
      background.setStrokeStyle(2, 0xff3355, 1)
    })
    background.on('pointerout', () => {
      background.setFillStyle(0x111827, 1)
      background.setStrokeStyle(1, 0xff3355, 0.9)
    })

    button.add([background, label])

    return button
  }

  layoutMenu() {
    const { width, height } = this.scale
    const panelWidth = Math.min(620, width * 0.82)
    const panelHeight = 360
    const panelX = width / 2 - panelWidth / 2
    const panelY = height / 2 - panelHeight / 2

    this.drawBackground(width, height)
    this.menuPanel.clear()
    this.menuPanel.fillStyle(0x070b14, 0.94)
    this.menuPanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 12)
    this.menuPanel.lineStyle(2, 0xff3355, 0.88)
    this.menuPanel.strokeRoundedRect(panelX + 1, panelY + 1, panelWidth - 2, panelHeight - 2, 12)
    this.menuPanel.lineStyle(1, 0xffffff, 0.12)
    this.menuPanel.strokeRoundedRect(panelX + 12, panelY + 12, panelWidth - 24, panelHeight - 24, 8)

    this.title.setPosition(width / 2, height / 2 - 96)
    this.subtitle.setPosition(width / 2, height / 2 - 46)
    this.startButton.setPosition(width / 2, height / 2 + 68)
  }

  drawBackground(width, height) {
    this.backgroundGraphics.clear()

    const bands = 24

    for (let band = 0; band < bands; band += 1) {
      const progress = band / (bands - 1)
      const red = Phaser.Math.Linear(5, 16, progress)
      const green = Phaser.Math.Linear(6, 12, progress)
      const blue = Phaser.Math.Linear(16, 32, progress)
      const color = Phaser.Display.Color.GetColor(red, green, blue)
      const bandY = (height / bands) * band

      this.backgroundGraphics.fillStyle(color, 1)
      this.backgroundGraphics.fillRect(0, bandY, width, height / bands + 1)
    }
  }
}
