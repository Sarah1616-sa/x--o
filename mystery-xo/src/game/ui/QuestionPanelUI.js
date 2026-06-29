export class QuestionPanelUI {
  constructor(scene, { drawLocalCard, createPanelHeading, createPanelText, setTextWrap }) {
    this.scene = scene
    this.drawLocalCard = drawLocalCard
    this.createPanelHeading = createPanelHeading
    this.createPanelText = createPanelText
    this.setTextWrap = setTextWrap
    this.answerStatusLabels = {}
    this.answerButtons = {}
    this.questionModal = null
    this.questionTimerText = null
    this.questionResultLabel = null
    this.questionIdleText = null
    this.questionTimerIdleText = null
  }

  createSidebarElements() {
    this.questionPromptGraphics = this.scene.add.graphics()
    this.questionTimerGraphics = this.scene.add.graphics()
    this.questionResultGraphics = this.scene.add.graphics()
    this.questionAreaHeading = this.createPanelHeading('منطقة السؤال')
    this.questionIdleText = this.createPanelText('بانتظار اختيار خانة من اللوحة', 15, '#cbd5e1')
    this.questionTimerIdleText = this.createPanelText('المؤقت: --', 15, '#f9d65c')
    this.questionResultHeading = this.createPanelHeading('النتيجة')
    this.questionResultLabel = this.createPanelText('النتيجة: بانتظار السؤال', 15, '#ffffff')

    return [
      this.questionPromptGraphics,
      this.questionTimerGraphics,
      this.questionResultGraphics,
      this.questionAreaHeading,
      this.questionIdleText,
      this.questionTimerIdleText,
      this.questionResultHeading,
      this.questionResultLabel,
    ]
  }

  layoutSidebar(rightPanelWidth, sidePanelHeight) {
    this.drawLocalCard(this.questionTimerGraphics, rightPanelWidth / 2 - 82, 60, 164, 42, {
      fillColor: 0x24101a,
      fillAlpha: 0.95,
      strokeAlpha: 0.8,
      radius: 7,
      accent: false,
    })
    this.drawLocalCard(this.questionPromptGraphics, 18, 118, rightPanelWidth - 36, 112, {
      fillColor: 0x0b1220,
      fillAlpha: 0.82,
      strokeAlpha: 0.35,
      radius: 8,
    })
    this.drawLocalCard(this.questionResultGraphics, 18, sidePanelHeight - 112, rightPanelWidth - 36, 84, {
      fillColor: 0x120812,
      fillAlpha: 0.78,
      strokeAlpha: 0.5,
      radius: 8,
    })

    this.questionAreaHeading.setPosition(rightPanelWidth / 2, 34)
    this.questionTimerIdleText.setFontSize(18)
    this.questionTimerIdleText.setFontStyle('bold')
    this.questionTimerIdleText.setPosition(rightPanelWidth / 2, 81)
    this.questionIdleText.setPosition(rightPanelWidth / 2, 174)
    this.questionResultHeading.setPosition(rightPanelWidth / 2, sidePanelHeight - 88)
    this.questionResultLabel.setPosition(rightPanelWidth / 2, sidePanelHeight - 54)
    this.setTextWrap(this.questionIdleText, rightPanelWidth - 44)
    this.setTextWrap(this.questionResultLabel, rightPanelWidth - 44)
  }

  setIdleVisible(isVisible) {
    if (this.questionIdleText) {
      this.questionIdleText.setVisible(isVisible)
    }

    if (this.questionTimerIdleText) {
      this.questionTimerIdleText.setVisible(isVisible)
    }
  }

  setResultText(message) {
    if (this.questionResultLabel) {
      this.questionResultLabel.setText(message)
    }
  }

  renderQuestionPanel({ rightPanel, question, questionTimeRemaining, onSelectAnswer, onSubmit }) {
    if (!rightPanel) {
      return
    }

    this.destroyQuestionModal()
    this.answerStatusLabels = {}
    this.answerButtons = {}

    const { panelWidth, panelHeight, x, y } = this.getQuestionPanelMetrics(rightPanel)
    this.questionModal = this.scene.add.container(x, y)

    const panel = this.scene.add.graphics()
    const questionCard = this.scene.add.graphics()
    const timerCard = this.scene.add.graphics()

    this.drawLocalCard(panel, -panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, {
      fillColor: 0x070b14,
      fillAlpha: 0.98,
      strokeAlpha: 0.4,
      radius: 10,
    })
    this.drawLocalCard(questionCard, -panelWidth / 2 + 16, -panelHeight / 2 + 18, panelWidth - 32, 98, {
      fillColor: 0x120812,
      fillAlpha: 0.9,
      strokeAlpha: 0.75,
      radius: 8,
    })
    this.drawLocalCard(timerCard, -74, -panelHeight / 2 + 76, 148, 34, {
      fillColor: 0x24101a,
      fillAlpha: 0.96,
      strokeAlpha: 0.86,
      radius: 6,
      accent: false,
    })

    const questionText = this.scene.add
      .text(0, -panelHeight / 2 + 48, question.question, {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        fontStyle: 'bold',
        align: 'right',
        rtl: true,
        wordWrap: { width: panelWidth - 48 },
      })
      .setOrigin(0.5)

    this.questionTimerText = this.scene.add
      .text(0, -panelHeight / 2 + 93, `الوقت: ${questionTimeRemaining}`, {
        color: '#f9d65c',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)

    const sectionWidth = panelWidth - 34
    const firstSectionY = -panelHeight / 2 + 148
    const secondSectionY = firstSectionY + Math.min(210, Math.max(184, panelHeight * 0.33))

    this.questionModal.add([panel, questionCard, timerCard, questionText, this.questionTimerText])
    this.createAnswerSection({
      role: 'captain',
      title: 'إجابة الكابتن',
      x: 0,
      y: firstSectionY,
      sectionWidth,
      question,
      onSelectAnswer,
    })
    this.createAnswerSection({
      role: 'partner',
      title: 'إجابة الشريك',
      x: 0,
      y: secondSectionY,
      sectionWidth,
      question,
      onSelectAnswer,
    })
    this.questionModal.add(this.createSubmitButton(panelHeight, onSubmit))
    rightPanel.container.add(this.questionModal)
  }

  getQuestionPanelMetrics(rightPanel) {
    const panelWidth = Math.max(280, rightPanel.width - 34)
    const panelHeight = Math.max(500, rightPanel.height - 190)

    return {
      panelWidth,
      panelHeight,
      x: rightPanel.width / 2,
      y: 74 + panelHeight / 2,
    }
  }

  createAnswerSection({ role, title, x, y, sectionWidth, question, onSelectAnswer }) {
    this.answerButtons[role] = []

    const heading = this.scene.add
      .text(x, y, title, {
        color: '#ff3355',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)
    const selectedText = this.scene.add
      .text(x, y + 26, 'الاختيار: لا يوجد', {
        color: '#cbd5e1',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)

    this.answerStatusLabels[role] = selectedText
    this.questionModal.add([heading, selectedText])

    question.options.forEach((option, answerIndex) => {
      const button = this.createAnswerButton({
        role,
        choice: option,
        answerIndex,
        x,
        y: y + 58 + answerIndex * 42,
        buttonWidth: sectionWidth,
        onSelectAnswer,
      })

      this.answerButtons[role].push(button)
      this.questionModal.add(button)
    })
  }

  createAnswerButton({ role, choice, answerIndex, x, y, buttonWidth, onSelectAnswer }) {
    const button = this.scene.add.container(x, y)
    const background = this.scene.add
      .rectangle(0, 0, buttonWidth, 36, 0x111827, 1)
      .setStrokeStyle(1, 0xffffff, 0.24)
      .setInteractive({ useHandCursor: true })
    const label = this.scene.add
      .text(0, 0, choice, {
        color: '#e5e7eb',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        align: 'right',
        rtl: true,
        wordWrap: { width: buttonWidth - 16 },
      })
      .setOrigin(0.5)

    background.on('pointerdown', () => {
      onSelectAnswer(role, answerIndex)
    })
    background.on('pointerover', () => {
      button.isHovered = true
      this.updateAnswerButtonVisual(button, false)
    })
    background.on('pointerout', () => {
      button.isHovered = false
      this.updateAnswerButtonVisual(button, false)
    })

    button.add([background, label])
    button.role = role
    button.answerIndex = answerIndex
    button.background = background
    button.label = label
    button.isHovered = false

    return button
  }

  createSubmitButton(panelHeight, onSubmit) {
    const button = this.scene.add.container(0, panelHeight / 2 - 46)
    const background = this.scene.add
      .rectangle(0, 0, 220, 42, 0xff3355, 1)
      .setInteractive({ useHandCursor: true })
    const label = this.scene.add
      .text(0, 0, 'إرسال الإجابات', {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)

    background.on('pointerdown', onSubmit)
    button.add([background, label])

    return button
  }

  updateTimerText(timeRemaining) {
    if (!this.questionTimerText) {
      return
    }

    this.questionTimerText.setText(`الوقت: ${timeRemaining}`)
    this.questionTimerText.setColor(timeRemaining <= 5 ? '#ff3355' : '#f9d65c')
  }

  updateSelectedAnswer(role, choice) {
    const label = role === 'captain' ? 'الكابتن' : 'الشريك'
    if (this.answerStatusLabels[role]) {
      this.answerStatusLabels[role].setText(`${label}: ${choice}`)
    }
  }

  refreshSelectedAnswers(teamAnswers, getChoice) {
    Object.keys(this.answerStatusLabels).forEach((role) => {
      if (teamAnswers[role] !== null) {
        this.updateSelectedAnswer(role, getChoice(role))
      }
    })
  }

  updateAnswerButtonStates(role, selectedAnswerIndex) {
    if (!this.answerButtons[role]) {
      return
    }

    this.answerButtons[role].forEach((button) => {
      this.updateAnswerButtonVisual(button, selectedAnswerIndex === button.answerIndex)
    })
  }

  updateAnswerButtonVisual(button, isSelected) {
    if (isSelected) {
      button.background.setFillStyle(0x35111b, 1)
      button.background.setStrokeStyle(2, 0xff3355, 1)
      button.label.setColor('#ffffff')
      return
    }

    if (button.isHovered) {
      button.background.setFillStyle(0x263241, 1)
      button.background.setStrokeStyle(1, 0xff3355, 0.85)
      button.label.setColor('#ffffff')
      return
    }

    button.background.setFillStyle(0x111827, 1)
    button.background.setStrokeStyle(1, 0xffffff, 0.24)
    button.label.setColor('#e5e7eb')
  }

  destroyQuestionModal() {
    if (this.questionModal) {
      this.questionModal.destroy()
    }

    this.questionModal = null
    this.questionTimerText = null
    this.answerStatusLabels = {}
    this.answerButtons = {}
  }
}
