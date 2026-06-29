export class MatchInfoUI {
  constructor(scene, { drawLocalCard }) {
    this.scene = scene
    this.drawLocalCard = drawLocalCard
  }

  createUI() {
    return {
      stageCardGraphics: this.scene.add.graphics(),
      teamXCardGraphics: this.scene.add.graphics(),
      teamOCardGraphics: this.scene.add.graphics(),
      title: this.scene.add
        .text(0, 0, 'لعبة الغموض XO', {
          color: '#ff3355',
          fontFamily: 'Arial, sans-serif',
          fontSize: '32px',
          align: 'center',
          rtl: true,
        })
        .setOrigin(0.5)
        .setShadow(0, 0, '#ff003c', 12, true, true),
      stageLabel: this.scene.add
        .text(0, 0, '', {
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          align: 'center',
          rtl: true,
        })
        .setOrigin(0.5),
      teamXScoreLabel: this.scene.add
        .text(0, 0, '', {
          color: '#ff3355',
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          align: 'left',
          rtl: true,
        })
        .setOrigin(0, 0.5),
      teamOScoreLabel: this.scene.add
        .text(0, 0, '', {
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          align: 'right',
          rtl: true,
        })
        .setOrigin(1, 0.5),
    }
  }

  updateMatchInfo(stageLabel, teamXScoreLabel, teamOScoreLabel, currentStage, maxStages, stageScores) {
    stageLabel.setText(`الجولة ${currentStage}/${maxStages}`)
    teamXScoreLabel.setText(`الفريق X  ${stageScores.X}`)
    teamOScoreLabel.setText(`الفريق O  ${stageScores.O}`)
  }

  layout({
    topBarWidth,
    currentPlayer,
    stageCardGraphics,
    teamXCardGraphics,
    teamOCardGraphics,
    title,
    stageLabel,
    teamXScoreLabel,
    teamOScoreLabel,
  }) {
    this.drawLocalCard(stageCardGraphics, topBarWidth / 2 - 116, 39, 232, 26, {
      fillColor: 0x150811,
      fillAlpha: 0.86,
      strokeAlpha: 0.72,
      radius: 7,
      accent: false,
    })
    this.drawLocalCard(teamXCardGraphics, 20, 18, 238, 42, {
      fillColor: currentPlayer === 'X' ? 0x1f0812 : 0x0b1220,
      strokeColor: 0xff3355,
      strokeAlpha: currentPlayer === 'X' ? 0.95 : 0.42,
      radius: 7,
    })
    this.drawLocalCard(teamOCardGraphics, topBarWidth - 258, 18, 238, 42, {
      fillColor: currentPlayer === 'O' ? 0x1f0812 : 0x0b1220,
      strokeColor: 0xff3355,
      strokeAlpha: currentPlayer === 'O' ? 0.95 : 0.42,
      radius: 7,
    })

    title.setFontSize(24)
    title.setPosition(topBarWidth / 2, 23)
    stageLabel.setFontSize(18)
    stageLabel.setFontStyle('bold')
    stageLabel.setPosition(topBarWidth / 2, 53)
    teamXScoreLabel.setOrigin(0.5)
    teamOScoreLabel.setOrigin(0.5)
    teamXScoreLabel.setFontSize(19)
    teamOScoreLabel.setFontSize(19)
    teamXScoreLabel.setFontStyle('bold')
    teamOScoreLabel.setFontStyle('bold')
    teamXScoreLabel.setPosition(139, 39)
    teamOScoreLabel.setPosition(topBarWidth - 139, 39)
  }
}
