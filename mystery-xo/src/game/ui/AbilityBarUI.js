export class AbilityBarUI {
  constructor(scene, { setTextWrap }) {
    this.scene = scene
    this.setTextWrap = setTextWrap
  }

  createUI({ onActivatePower, onActivateShield, onActivateSteal, onActivateTrap }) {
    const powerCountsLabel = this.createInfoLabel('#f9d65c')
    const shieldCountsLabel = this.createInfoLabel('#7dd3fc')
    const stealCountsLabel = this.createInfoLabel('#34d399')
    const trapCountsLabel = this.createInfoLabel('#fb923c')

    const powerStatusLabel = this.createInfoLabel('#f9d65c')
    const shieldStatusLabel = this.createInfoLabel('#7dd3fc')
    const stealStatusLabel = this.createInfoLabel('#34d399')
    const trapStatusLabel = this.createInfoLabel('#fb923c')

    const powerButton = this.createAbilityButton('تفعيل باور', 'باور', 0xff3355, 0x151923, onActivatePower)
    const shieldButton = this.createAbilityButton('تفعيل الحماية', 'الحماية', 0x7dd3fc, 0x101c27, onActivateShield)
    const stealButton = this.createAbilityButton('تفعيل الاستحواذ', 'الاستحواذ', 0x34d399, 0x10241e, onActivateSteal)
    const trapButton = this.createAbilityButton('تفعيل الكمين', 'الكمين', 0xfb923c, 0x2c1a12, onActivateTrap)

    return {
      powerCountsLabel,
      shieldCountsLabel,
      stealCountsLabel,
      trapCountsLabel,
      powerStatusLabel,
      shieldStatusLabel,
      stealStatusLabel,
      trapStatusLabel,
      powerButton,
      shieldButton,
      stealButton,
      trapButton,
    }
  }

  createInfoLabel(color) {
    return this.scene.add
      .text(0, 0, '', {
        color,
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)
  }

  createAbilityButton(labelText, iconText, strokeColor, fillColor, onClick) {
    const button = this.scene.add.container(0, 0)
    const background = this.scene.add
      .rectangle(0, 0, 210, 68, fillColor, 1)
      .setStrokeStyle(1, strokeColor, 0.85)
      .setInteractive({ useHandCursor: true })
    const accent = this.scene.add.rectangle(-92, 0, 4, 48, strokeColor, 0.95)
    const icon = this.scene.add
      .text(0, -17, iconText, {
        color: '#ff3355',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)
    const label = this.scene.add
      .text(0, 17, labelText, {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)

    background.on('pointerdown', onClick)
    button.add([background, accent, icon, label])
    button.background = background
    button.accent = accent
    button.icon = icon
    button.label = label
    button.fillColor = fillColor
    button.isAbilityEnabled = true

    return button
  }

  setButtonEnabled(button, isEnabled, strokeColor) {
    button.isAbilityEnabled = isEnabled

    if (isEnabled) {
      button.background.setInteractive({ useHandCursor: true })
      button.background.setFillStyle(button.fillColor, 1)
      button.background.setStrokeStyle(1, strokeColor, 0.85)
      button.background.setAlpha(1)
      button.accent.setAlpha(1)
      button.icon.setColor('#ff3355')
      button.icon.setAlpha(1)
      button.label.setAlpha(1)
      return
    }

    button.background.disableInteractive()
    button.background.setFillStyle(0x090d16, 1)
    button.background.setStrokeStyle(1, 0x475569, 0.55)
    button.background.setAlpha(0.55)
    button.accent.setAlpha(0.35)
    button.icon.setColor('#94a3b8')
    button.icon.setAlpha(0.45)
    button.label.setAlpha(0.62)
  }

  updateCounts(labels, counts) {
    labels.powerCountsLabel.setText(`باور  X ${counts.power.X}   |   O ${counts.power.O}`)
    labels.shieldCountsLabel.setText(`الحماية  X ${counts.shield.X}   |   O ${counts.shield.O}`)
    labels.stealCountsLabel.setText(`الاستحواذ  X ${counts.steal.X}   |   O ${counts.steal.O}`)
    labels.trapCountsLabel.setText(`الكمين  X ${counts.trap.X}   |   O ${counts.trap.O}`)
  }

  updateAbilityState({ statusLabel, button, statusText, buttonText, canActivate, strokeColor }) {
    statusLabel.setText(statusText)
    button.label.setText(buttonText)
    this.setButtonEnabled(button, canActivate, strokeColor)
  }

  layoutSidebar(leftPanelWidth) {
    const centerX = leftPanelWidth / 2
    const leftTextWidth = leftPanelWidth - 36

    this.powerCountsLabel.setPosition(centerX, 158)
    this.shieldCountsLabel.setPosition(centerX, 190)
    this.stealCountsLabel.setPosition(centerX, 222)
    this.trapCountsLabel.setPosition(centerX, 254)
    this.powerStatusLabel.setPosition(centerX, 356)
    this.shieldStatusLabel.setPosition(centerX, 388)
    this.stealStatusLabel.setPosition(centerX, 420)
    this.trapStatusLabel.setPosition(centerX, 452)

    this.setTextWrap(this.powerCountsLabel, leftTextWidth)
    this.setTextWrap(this.shieldCountsLabel, leftTextWidth)
    this.setTextWrap(this.stealCountsLabel, leftTextWidth)
    this.setTextWrap(this.trapCountsLabel, leftTextWidth)
    this.setTextWrap(this.powerStatusLabel, leftTextWidth)
    this.setTextWrap(this.shieldStatusLabel, leftTextWidth)
    this.setTextWrap(this.stealStatusLabel, leftTextWidth)
    this.setTextWrap(this.trapStatusLabel, leftTextWidth)
  }

  layoutBottomBar(bottomPanelWidth, bottomBarHeight) {
    const bottomButtonGap = Math.min(240, Math.max(204, (bottomPanelWidth - 120) / 4))
    const bottomButtonStartX = bottomPanelWidth / 2 - bottomButtonGap * 1.5

    this.powerButton.setPosition(bottomButtonStartX, bottomBarHeight / 2)
    this.shieldButton.setPosition(bottomButtonStartX + bottomButtonGap, bottomBarHeight / 2)
    this.stealButton.setPosition(bottomButtonStartX + bottomButtonGap * 2, bottomBarHeight / 2)
    this.trapButton.setPosition(bottomButtonStartX + bottomButtonGap * 3, bottomBarHeight / 2)
  }

  bindReferences(refs) {
    Object.assign(this, refs)
  }
}
