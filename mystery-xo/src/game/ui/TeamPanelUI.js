export class TeamPanelUI {
  constructor(scene, { drawLocalCard, createPanelHeading, setTextWrap }) {
    this.scene = scene
    this.drawLocalCard = drawLocalCard
    this.createPanelHeading = createPanelHeading
    this.setTextWrap = setTextWrap
  }

  createUI() {
    return {
      currentTeamCardGraphics: this.scene.add.graphics(),
      resourceCardGraphics: this.scene.add.graphics(),
      statusCardGraphics: this.scene.add.graphics(),
      currentTeamHeading: this.createPanelHeading('الفريق الحالي'),
      resourcesHeading: this.createPanelHeading('الموارد'),
      abilityStatusHeading: this.createPanelHeading('حالة القدرات'),
      turnLabel: this.scene.add
        .text(0, 0, '', {
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          align: 'center',
          rtl: true,
        })
        .setOrigin(0.5),
    }
  }

  updateTurnLabel(turnLabel, currentPlayer) {
    turnLabel.setText(`دور الفريق ${currentPlayer}`)
    turnLabel.setColor(currentPlayer === 'X' ? '#ff3355' : '#ffffff')
  }

  layout({
    leftPanelWidth,
    currentPlayer,
    currentTeamCardGraphics,
    resourceCardGraphics,
    statusCardGraphics,
    currentTeamHeading,
    resourcesHeading,
    abilityStatusHeading,
    turnLabel,
  }) {
    this.drawLocalCard(currentTeamCardGraphics, 18, 20, leftPanelWidth - 36, 82, {
      fillColor: currentPlayer === 'X' ? 0x1f0812 : 0x111827,
      strokeColor: 0xff3355,
      strokeAlpha: 0.84,
      radius: 8,
    })
    this.drawLocalCard(resourceCardGraphics, 18, 114, leftPanelWidth - 36, 176, {
      fillColor: 0x0b1220,
      fillAlpha: 0.82,
      strokeAlpha: 0.38,
      radius: 8,
    })
    resourceCardGraphics.lineStyle(1, 0xffffff, 0.1)
    resourceCardGraphics.lineBetween(34, 176, leftPanelWidth - 34, 176)
    resourceCardGraphics.lineBetween(34, 208, leftPanelWidth - 34, 208)
    resourceCardGraphics.lineBetween(34, 240, leftPanelWidth - 34, 240)
    this.drawLocalCard(statusCardGraphics, 18, 306, leftPanelWidth - 36, 178, {
      fillColor: 0x0b1220,
      fillAlpha: 0.82,
      strokeAlpha: 0.38,
      radius: 8,
    })

    currentTeamHeading.setPosition(leftPanelWidth / 2, 34)
    turnLabel.setFontSize(22)
    turnLabel.setFontStyle('bold')
    turnLabel.setPosition(leftPanelWidth / 2, 72)
    resourcesHeading.setPosition(leftPanelWidth / 2, 126)
    abilityStatusHeading.setPosition(leftPanelWidth / 2, 318)
    this.setTextWrap(turnLabel, leftPanelWidth - 36)
  }
}
