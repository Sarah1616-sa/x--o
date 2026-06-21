import Phaser from 'phaser'

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
  }

  create() {
    const { width, height } = this.scale

    this.add
      .text(width / 2, height / 2, 'Mystery XO', {
        color: '#ff0000',
        fontFamily: 'Arial, sans-serif',
        fontSize: '48px',
      })
      .setOrigin(0.5)
  }
}
