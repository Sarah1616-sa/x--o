import Phaser from 'phaser'
import { MainMenu } from './scenes/MainMenu.js'
import { LobbyScene } from './scenes/LobbyScene.js'
import { GameScene } from './scenes/GameScene.js'

export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  dom: {
    createContainer: true,
  },
  scene: [MainMenu, LobbyScene, GameScene],
}
