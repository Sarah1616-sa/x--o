import Phaser from 'phaser'

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
  }

  create() {
    this.backgroundGraphics = this.add.graphics()
    this.gridGraphics = this.add.graphics()
    this.board = this.createEmptyBoard()
    this.cells = []
    this.marks = []
    this.currentPlayer = 'X'
    this.stageLocked = false
    this.questionOpen = false
    this.pendingCellIndex = null
    this.teamAnswers = this.createTeamAnswerState()
    this.answerStatusLabels = {}
    this.questionTimerEvent = null
    this.questionTimeRemaining = 15
    this.questionIndex = 0
    this.questionBank = this.createQuestionBank()
    this.winningLines = this.createWinningLines()
    this.powerRemaining = {
      X: 1,
      O: 1,
    }
    this.powerArmedTeam = null
    this.shieldRemaining = {
      X: 1,
      O: 1,
    }
    this.shieldArmedTeam = null
    this.stealRemaining = {
      X: 1,
      O: 1,
    }
    this.stealArmedTeam = null
    this.trapRemaining = {
      X: 1,
      O: 1,
    }
    this.trapArmedTeam = null
    this.trapSquares = new Map()
    this.protectedSquares = new Set()
    this.protectedMarkers = []
    this.currentStage = 1
    this.maxStages = 5
    this.stageScores = {
      X: 0,
      O: 0,
    }
    this.matchComplete = false

    this.title = this.add
      .text(0, 0, 'لعبة الغموض XO', {
        color: '#ff3355',
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        letterSpacing: 2,
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#ff003c', 12, true, true)

    this.turnLabel = this.add
      .text(0, 0, '', {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)

    this.stageLabel = this.add
      .text(0, 0, '', {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)

    this.shieldCountsLabel = this.add
      .text(0, 0, '', {
        color: '#7dd3fc',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)

    this.stealCountsLabel = this.add
      .text(0, 0, '', {
        color: '#34d399',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)

    this.trapCountsLabel = this.add
      .text(0, 0, '', {
        color: '#fb923c',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        align: 'center',
      })
      .setOrigin(0.5)

    this.powerStatusLabel = this.add
      .text(0, 0, '', {
        color: '#f9d65c',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)

    this.powerButton = this.createPowerButton()

    this.shieldStatusLabel = this.add
      .text(0, 0, '', {
        color: '#7dd3fc',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)

    this.shieldButton = this.createShieldButton()

    this.stealStatusLabel = this.add
      .text(0, 0, '', {
        color: '#34d399',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        align: 'center',
      })
      .setOrigin(0.5)

    this.stealButton = this.createStealButton()

    this.trapStatusLabel = this.add
      .text(0, 0, '', {
        color: '#fb923c',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        align: 'center',
      })
      .setOrigin(0.5)

    this.trapButton = this.createTrapButton()

    this.createCells()
    this.updateTurnLabel()
    this.updateStageLabel()
    this.updateShieldCountsLabel()
    this.updateStealCountsLabel()
    this.updateTrapCountsLabel()
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateStealUI()
    this.updateTrapUI()
    this.layoutBoard()

    this.scale.on('resize', this.layoutBoard, this)
  }

  createEmptyBoard() {
    // Board state mirrors the 3x3 grid: null means empty, X/O means occupied.
    return [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ]
  }

  createWinningLines() {
    // Lines use flat cell indexes so future stages can reuse the same checker.
    return [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ]
  }

  createQuestionBank() {
    return [
      {
        question: 'ما عاصمة المملكة العربية السعودية؟',
        options: ['جدة', 'الرياض', 'مكة', 'الدمام'],
        correctAnswerIndex: 1,
      },
      {
        question: 'كم عدد أيام السنة الميلادية العادية؟',
        options: ['360', '365', '366', '364'],
        correctAnswerIndex: 1,
      },
      {
        question: 'ما الكوكب المعروف بالكوكب الأحمر؟',
        options: ['الزهرة', 'المريخ', 'المشتري', 'عطارد'],
        correctAnswerIndex: 1,
      },
      {
        question: 'كم عدد ألوان قوس قزح؟',
        options: ['5', '6', '7', '8'],
        correctAnswerIndex: 2,
      },
      {
        question: 'ما الغاز الذي نتنفسه للبقاء على قيد الحياة؟',
        options: ['الأكسجين', 'الهيدروجين', 'النيتروجين', 'ثاني أكسيد الكربون'],
        correctAnswerIndex: 0,
      },
      {
        question: 'ما الحيوان الذي يلقب بسفينة الصحراء؟',
        options: ['الحصان', 'الجمل', 'الفيل', 'الغزال'],
        correctAnswerIndex: 1,
      },
      {
        question: 'كم عدد اللاعبين في فريق كرة القدم داخل الملعب؟',
        options: ['9', '10', '11', '12'],
        correctAnswerIndex: 2,
      },
      {
        question: 'كم عدد أشواط مباراة كرة القدم؟',
        options: ['شوط واحد', 'شوطان', 'ثلاثة أشواط', 'أربعة أشواط'],
        correctAnswerIndex: 1,
      },
      {
        question: 'في أي رياضة يستخدم المضرب والكرة الصفراء؟',
        options: ['كرة السلة', 'التنس', 'السباحة', 'الملاكمة'],
        correctAnswerIndex: 1,
      },
      {
        question: 'كم عدد الحلقات في شعار الألعاب الأولمبية؟',
        options: ['4', '5', '6', '7'],
        correctAnswerIndex: 1,
      },
      {
        question: 'ما الرياضة التي يشتهر فيها مصطلح الضربة الساحقة؟',
        options: ['الكرة الطائرة', 'الجولف', 'الرماية', 'الشطرنج'],
        correctAnswerIndex: 0,
      },
      {
        question: 'أي رياضة تقام عادة في حوض مائي؟',
        options: ['التزلج', 'السباحة', 'كرة اليد', 'ركوب الدراجات'],
        correctAnswerIndex: 1,
      },
      {
        question: 'من الشخصية الكرتونية المعروفة بارتداء قفازات بيضاء وأذنين دائريتين؟',
        options: ['سبونج بوب', 'ميكي ماوس', 'توم', 'باغز باني'],
        correctAnswerIndex: 1,
      },
      {
        question: 'ما الآلة الموسيقية التي تحتوي على مفاتيح بيضاء وسوداء؟',
        options: ['العود', 'البيانو', 'الناي', 'الطبلة'],
        correctAnswerIndex: 1,
      },
      {
        question: 'ما نوع العمل الفني الذي يعرض على خشبة أمام الجمهور؟',
        options: ['مسرحية', 'رواية', 'لوحة', 'بودكاست'],
        correctAnswerIndex: 0,
      },
      {
        question: 'ما اسم الجوائز السينمائية العالمية الشهيرة التي تمنح في هوليوود؟',
        options: ['الأوسكار', 'نوبل', 'غرامي', 'إيمي'],
        correctAnswerIndex: 0,
      },
      {
        question: 'أي منصة اشتهرت بمقاطع الفيديو القصيرة؟',
        options: ['تيك توك', 'ويكيبيديا', 'لينكدإن', 'خرائط جوجل'],
        correctAnswerIndex: 0,
      },
      {
        question: 'ما اللون الناتج من خلط الأحمر والأزرق؟',
        options: ['الأخضر', 'البرتقالي', 'البنفسجي', 'الأصفر'],
        correctAnswerIndex: 2,
      },
      {
        question: 'في أي مدينة تقع الأهرامات؟',
        options: ['الإسكندرية', 'القاهرة', 'الجيزة', 'الأقصر'],
        correctAnswerIndex: 2,
      },
      {
        question: 'من هو أول الخلفاء الراشدين؟',
        options: ['عمر بن الخطاب', 'أبو بكر الصديق', 'عثمان بن عفان', 'علي بن أبي طالب'],
        correctAnswerIndex: 1,
      },
      {
        question: 'في أي عام تأسست المملكة العربية السعودية الحديثة؟',
        options: ['1902', '1927', '1932', '1953'],
        correctAnswerIndex: 2,
      },
      {
        question: 'ما الحضارة القديمة التي بنت الأهرامات؟',
        options: ['الرومانية', 'المصرية', 'الفارسية', 'الإغريقية'],
        correctAnswerIndex: 1,
      },
      {
        question: 'من القائد الذي فتح القسطنطينية عام 1453؟',
        options: ['صلاح الدين الأيوبي', 'محمد الفاتح', 'هارون الرشيد', 'طارق بن زياد'],
        correctAnswerIndex: 1,
      },
      {
        question: 'ما اسم الطريق التجاري القديم الذي ربط الشرق بالغرب؟',
        options: ['طريق الحرير', 'طريق البخور', 'طريق الأطلسي', 'طريق القوافل'],
        correctAnswerIndex: 0,
      },
      {
        question: 'ما أكبر قارة في العالم؟',
        options: ['أفريقيا', 'آسيا', 'أوروبا', 'أمريكا الجنوبية'],
        correctAnswerIndex: 1,
      },
      {
        question: 'ما أطول نهر في العالم غالبا؟',
        options: ['النيل', 'الأمازون', 'الفرات', 'الدانوب'],
        correctAnswerIndex: 0,
      },
      {
        question: 'ما المحيط الأكبر مساحة؟',
        options: ['الأطلسي', 'الهندي', 'الهادئ', 'المتجمد الشمالي'],
        correctAnswerIndex: 2,
      },
      {
        question: 'ما عاصمة اليابان؟',
        options: ['سيول', 'طوكيو', 'بكين', 'بانكوك'],
        correctAnswerIndex: 1,
      },
      {
        question: 'في أي قارة تقع البرازيل؟',
        options: ['أوروبا', 'آسيا', 'أمريكا الجنوبية', 'أفريقيا'],
        correctAnswerIndex: 2,
      },
      {
        question: 'ما الدولة التي تضم مدينتي مكة والمدينة؟',
        options: ['الإمارات', 'السعودية', 'مصر', 'الأردن'],
        correctAnswerIndex: 1,
      },
    ]
  }

  createTeamAnswerState() {
    return {
      captain: null,
      partner: null,
    }
  }

  createCells() {
    // Each transparent rectangle is an input target for one board cell.
    for (let index = 0; index < 9; index += 1) {
      const cell = this.add
        .rectangle(0, 0, 1, 1, 0x000000, 0)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })

      cell.on('pointerdown', () => {
        this.handleCellClick(index)
      })

      this.cells.push(cell)
    }
  }

  handleCellClick(index) {
    const row = Math.floor(index / 3)
    const column = index % 3

    if (this.matchComplete || this.stageLocked || this.questionOpen) {
      return
    }

    if (this.stealArmedTeam === this.currentPlayer) {
      this.applyStealToCell(index)
      return
    }

    if (this.shieldArmedTeam === this.currentPlayer) {
      this.applyShieldToCell(index)
      return
    }

    if (this.trapArmedTeam === this.currentPlayer) {
      this.applyTrapToCell(index)
      return
    }

    if (this.board[row][column] !== null) {
      return
    }

    if (this.powerArmedTeam === this.currentPlayer) {
      this.claimCellAtIndex(index)
      return
    }

    this.pendingCellIndex = index
    this.showQuestionModal(this.getNextQuestion())
  }

  createMark(index, player) {
    if (this.marks[index]) {
      this.marks[index].destroy()
    }

    const mark = this.add
      .text(0, 0, player, {
        color: player === 'X' ? '#ff3355' : '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '72px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.marks[index] = mark
  }

  getNextQuestion() {
    const question = this.questionBank[this.questionIndex % this.questionBank.length]

    this.questionIndex += 1

    return question
  }

  showQuestionModal(question) {
    this.questionOpen = true
    this.activeQuestion = question
    this.teamAnswers = this.createTeamAnswerState()
    this.answerStatusLabels = {}
    this.questionTimeRemaining = 15

    const { width, height } = this.scale
    const panelWidth = Math.min(width * 0.9, 620)
    const panelHeight = Math.min(height * 0.82, 520)

    this.questionModal = this.add.container(width / 2, height / 2)
    this.questionModal.setDepth(10)

    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.55)
    const panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x111827, 1)
    const questionText = this.add
      .text(0, -panelHeight / 2 + 48, question.question, {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '19px',
        align: 'right',
        rtl: true,
        wordWrap: { width: panelWidth - 48 },
      })
      .setOrigin(0.5)
    this.questionTimerText = this.add
      .text(0, -panelHeight / 2 + 80, 'الوقت: 15', {
        color: '#f9d65c',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)

    this.questionModal.add([backdrop, panel, questionText, this.questionTimerText])
    this.createAnswerSection('captain', 'إجابة الكابتن', -panelWidth * 0.24, -panelHeight / 2 + 116, panelWidth * 0.42, question)
    this.createAnswerSection('partner', 'إجابة الشريك', panelWidth * 0.24, -panelHeight / 2 + 116, panelWidth * 0.42, question)
    this.questionModal.add(this.createSubmitButton(panelHeight))
    this.startQuestionTimer()
  }

  createAnswerSection(role, title, x, y, sectionWidth, question) {
    const heading = this.add
      .text(x, y, title, {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)
    const selectedText = this.add
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
      const button = this.createAnswerButton(role, option, answerIndex, x, y + 66 + answerIndex * 46, sectionWidth)

      this.questionModal.add(button)
    })
  }

  createAnswerButton(role, choice, answerIndex, x, y, buttonWidth) {
    const button = this.add.container(x, y)
    const background = this.add
      .rectangle(0, 0, buttonWidth, 36, 0x1f2937, 1)
      .setStrokeStyle(1, 0xffffff, 0.35)
      .setInteractive({ useHandCursor: true })
    const label = this.add
      .text(0, 0, choice, {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        align: 'right',
        rtl: true,
        wordWrap: { width: buttonWidth - 16 },
      })
      .setOrigin(0.5)

    background.on('pointerdown', () => {
      this.selectTeamAnswer(role, answerIndex)
    })

    button.add([background, label])

    return button
  }

  createSubmitButton(panelHeight) {
    const button = this.add.container(0, panelHeight / 2 - 46)
    const background = this.add
      .rectangle(0, 0, 220, 42, 0xff3355, 1)
      .setInteractive({ useHandCursor: true })
    const label = this.add
      .text(0, 0, 'إرسال الإجابات', {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)

    background.on('pointerdown', () => {
      this.submitTeamAnswers()
    })

    button.add([background, label])

    return button
  }

  selectTeamAnswer(role, answerIndex) {
    if (!this.questionOpen) {
      return
    }

    this.teamAnswers[role] = answerIndex
    this.updateSelectedAnswerLabel(role)
  }

  updateSelectedAnswerLabel(role) {
    const answerIndex = this.teamAnswers[role]
    const choice = this.activeQuestion.options[answerIndex]
    const label = role === 'captain' ? 'الكابتن' : 'الشريك'

    this.answerStatusLabels[role].setText(`${label}: ${choice}`)
  }

  submitTeamAnswers() {
    if (!this.questionOpen || !this.hasBothTeamAnswers()) {
      return
    }

    this.stopQuestionTimer()
    const isCorrect = this.areTeamAnswersCorrect()

    this.closeQuestionModal()

    if (isCorrect) {
      this.claimPendingCell()
      return
    }

    this.pendingCellIndex = null
    this.switchTurn()
  }

  hasBothTeamAnswers() {
    return this.teamAnswers.captain !== null && this.teamAnswers.partner !== null
  }

  areTeamAnswersCorrect() {
    const correctAnswerIndex = this.activeQuestion.correctAnswerIndex

    return (
      this.hasBothTeamAnswers() &&
      this.teamAnswers.captain === this.teamAnswers.partner &&
      this.teamAnswers.captain === correctAnswerIndex
    )
  }

  closeQuestionModal() {
    this.stopQuestionTimer()
    this.questionOpen = false
    if (this.questionModal) {
      this.questionModal.destroy()
    }
    this.questionModal = null
    this.questionTimerText = null
    this.activeQuestion = null
    this.teamAnswers = this.createTeamAnswerState()
    this.answerStatusLabels = {}
  }

  startQuestionTimer() {
    this.stopQuestionTimer()
    this.questionTimerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: this.tickQuestionTimer,
      callbackScope: this,
    })
  }

  stopQuestionTimer() {
    if (this.questionTimerEvent) {
      this.questionTimerEvent.remove(false)
      this.questionTimerEvent = null
    }
  }

  tickQuestionTimer() {
    if (!this.questionOpen) {
      this.stopQuestionTimer()
      return
    }

    this.questionTimeRemaining -= 1
    if (this.questionTimerText) {
      this.questionTimerText.setText(`الوقت: ${this.questionTimeRemaining}`)
    }

    if (this.questionTimeRemaining <= 0) {
      this.handleQuestionTimeout()
    }
  }

  handleQuestionTimeout() {
    if (!this.questionOpen) {
      return
    }

    this.pendingCellIndex = null
    this.closeQuestionModal()
    this.switchTurn()
  }

  getStageWinner(player) {
    return this.winningLines.some((line) =>
      line.every((index) => {
        const row = Math.floor(index / 3)
        const column = index % 3

        return this.board[row][column] === player
      }),
    )
  }

  isBoardFull() {
    return this.board.every((row) => row.every((cell) => cell !== null))
  }

  hasAnyStageWinner() {
    return this.getStageWinner('X') || this.getStageWinner('O')
  }

  declareStageWinner(player) {
    this.stageLocked = true
    this.turnLabel.setText(`فاز الفريق ${player} بالجولة`)
    this.awardStagePoint(player)
    this.updateAbilityUI()

    this.time.delayedCall(2000, () => {
      this.advanceStageOrFinishMatch()
    })
  }

  declareStageDraw() {
    this.stageLocked = true
    this.turnLabel.setText('\u062A\u0639\u0627\u062F\u0644 \u0627\u0644\u062C\u0648\u0644\u0629')
    this.updateAbilityUI()

    this.time.delayedCall(2000, () => {
      this.advanceStageOrFinishMatch()
    })
  }

  awardStagePoint(player) {
    this.stageScores[player] += 1
    this.updateStageLabel()
  }

  advanceStageOrFinishMatch() {
    if (this.currentStage >= this.maxStages) {
      this.completeMatch()
      return
    }

    this.currentStage += 1
    this.resetStage()
  }

  completeMatch() {
    this.matchComplete = true
    this.stageLocked = true
    this.updateAbilityUI()

    if (this.stageScores.X === this.stageScores.O) {
      this.turnLabel.setText('تعادل')
      return
    }

    const winner = this.stageScores.X > this.stageScores.O ? 'X' : 'O'

    this.turnLabel.setText(`فاز الفريق ${winner} بالمباراة`)
  }

  drawBackground(width, height) {
    // Horizontal bands create a subtle dark gradient without extra assets.
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

  drawGrid(boardX, boardY, boardSize, cellSize) {
    // A soft wide pass creates the glow; a thin pass keeps the grid readable.
    this.gridGraphics.clear()
    this.drawGridLines(boardX, boardY, boardSize, cellSize, 14, 0xff003c, 0.22)
    this.drawGridLines(boardX, boardY, boardSize, cellSize, 4, 0xff3355, 1)
  }

  drawGridLines(boardX, boardY, boardSize, cellSize, width, color, alpha) {
    this.gridGraphics.lineStyle(width, color, alpha)

    for (let line = 1; line < 3; line += 1) {
      const offset = line * cellSize

      this.gridGraphics.lineBetween(boardX + offset, boardY, boardX + offset, boardY + boardSize)
      this.gridGraphics.lineBetween(boardX, boardY + offset, boardX + boardSize, boardY + offset)
    }
  }

  positionCells(boardX, boardY, cellSize) {
    this.cells.forEach((cell, index) => {
      const column = index % 3
      const row = Math.floor(index / 3)

      cell.setPosition(boardX + column * cellSize, boardY + row * cellSize)
      cell.setSize(cellSize, cellSize)
      cell.input.hitArea.setTo(0, 0, cellSize, cellSize)
    })
  }

  positionMarks(boardX, boardY, cellSize) {
    this.marks.forEach((mark, index) => {
      const column = index % 3
      const row = Math.floor(index / 3)

      mark.setPosition(boardX + column * cellSize + cellSize / 2, boardY + row * cellSize + cellSize / 2)
      mark.setFontSize(Math.floor(cellSize * 0.48))
    })
  }

  createPowerButton() {
    const button = this.add.container(0, 0)
    const background = this.add
      .rectangle(0, 0, 190, 40, 0x1f2937, 1)
      .setStrokeStyle(1, 0xff3355, 0.7)
      .setInteractive({ useHandCursor: true })
    const label = this.add
      .text(0, 0, 'تفعيل القوة', {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)

    background.on('pointerdown', () => {
      this.activatePower()
    })

    button.add([background, label])
    button.background = background
    button.label = label

    return button
  }

  createShieldButton() {
    const button = this.add.container(0, 0)
    const background = this.add
      .rectangle(0, 0, 190, 40, 0x10222d, 1)
      .setStrokeStyle(1, 0x7dd3fc, 0.7)
      .setInteractive({ useHandCursor: true })
    const label = this.add
      .text(0, 0, 'تفعيل الدرع', {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)

    background.on('pointerdown', () => {
      this.activateShield()
    })

    button.add([background, label])
    button.background = background
    button.label = label

    return button
  }

  createStealButton() {
    const button = this.add.container(0, 0)
    const background = this.add
      .rectangle(0, 0, 190, 40, 0x123524, 1)
      .setStrokeStyle(1, 0x34d399, 0.7)
      .setInteractive({ useHandCursor: true })
    const label = this.add
      .text(0, 0, 'Activate Steal', {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        align: 'center',
      })
      .setOrigin(0.5)

    background.on('pointerdown', () => {
      this.activateSteal()
    })

    button.add([background, label])
    button.background = background
    button.label = label

    return button
  }

  createTrapButton() {
    const button = this.add.container(0, 0)
    const background = this.add
      .rectangle(0, 0, 190, 40, 0x3f2514, 1)
      .setStrokeStyle(1, 0xfb923c, 0.7)
      .setInteractive({ useHandCursor: true })
    const label = this.add
      .text(0, 0, 'Activate Trap', {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        align: 'center',
      })
      .setOrigin(0.5)

    background.on('pointerdown', () => {
      this.activateTrap()
    })

    button.add([background, label])
    button.background = background
    button.label = label

    return button
  }

  updateTurnLabel() {
    this.turnLabel.setText(`دور الفريق ${this.currentPlayer}`)
  }

  updateStageLabel() {
    this.stageLabel.setText(`الجولة ${this.currentStage}/${this.maxStages}   الفريق X: ${this.stageScores.X}   الفريق O: ${this.stageScores.O}   القوة X: ${this.powerRemaining.X}   القوة O: ${this.powerRemaining.O}`)
  }

  updateAbilityUI() {
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateStealUI()
    this.updateTrapUI()
  }

  updatePowerUI() {
    const isArmed = this.powerArmedTeam === this.currentPlayer
    const shieldArmed = this.shieldArmedTeam === this.currentPlayer
    const stealArmed = this.stealArmedTeam === this.currentPlayer
    const trapArmed = this.trapArmedTeam === this.currentPlayer
    const hasPower = this.powerRemaining[this.currentPlayer] > 0
    const canActivate = !this.matchComplete && !this.stageLocked && !this.questionOpen && hasPower && !isArmed && !shieldArmed && !stealArmed && !trapArmed

    if (isArmed) {
      this.powerStatusLabel.setText(`القوة: مفعلة للفريق ${this.currentPlayer}`)
    } else if (hasPower) {
      this.powerStatusLabel.setText(`القوة: متاحة للفريق ${this.currentPlayer}`)
    } else {
      this.powerStatusLabel.setText(`القوة: غير متاحة للفريق ${this.currentPlayer}`)
    }

    this.powerButton.label.setText(canActivate ? 'تفعيل القوة' : 'القوة غير متاحة')

    if (canActivate) {
      this.powerButton.background.setInteractive({ useHandCursor: true })
      this.powerButton.background.setAlpha(1)
      this.powerButton.label.setAlpha(1)
    } else {
      this.powerButton.background.disableInteractive()
      this.powerButton.background.setAlpha(0.55)
      this.powerButton.label.setAlpha(0.75)
    }
  }

  updateShieldCountsLabel() {
    this.shieldCountsLabel.setText(`الدرع X: ${this.shieldRemaining.X}   الدرع O: ${this.shieldRemaining.O}`)
  }

  updateShieldUI() {
    const isArmed = this.shieldArmedTeam === this.currentPlayer
    const powerArmed = this.powerArmedTeam === this.currentPlayer
    const stealArmed = this.stealArmedTeam === this.currentPlayer
    const trapArmed = this.trapArmedTeam === this.currentPlayer
    const hasShield = this.shieldRemaining[this.currentPlayer] > 0
    const hasTarget = this.hasValidShieldTarget()
    const canActivate = !this.matchComplete && !this.stageLocked && !this.questionOpen && hasShield && hasTarget && !isArmed && !powerArmed && !stealArmed && !trapArmed

    if (isArmed) {
      this.shieldStatusLabel.setText(`الدرع: مفعّل للفريق ${this.currentPlayer}`)
    } else if (hasShield && !hasTarget) {
      this.shieldStatusLabel.setText('Shield: No unprotected owned square')
    } else if (hasShield) {
      this.shieldStatusLabel.setText(`الدرع: متاح للفريق ${this.currentPlayer}`)
    } else {
      this.shieldStatusLabel.setText(`الدرع: مستخدم للفريق ${this.currentPlayer}`)
    }

    this.shieldButton.label.setText(canActivate ? 'تفعيل الدرع' : 'الدرع غير متاح')

    if (canActivate) {
      this.shieldButton.background.setInteractive({ useHandCursor: true })
      this.shieldButton.background.setAlpha(1)
      this.shieldButton.label.setAlpha(1)
    } else {
      this.shieldButton.background.disableInteractive()
      this.shieldButton.background.setAlpha(0.55)
      this.shieldButton.label.setAlpha(0.75)
    }
  }

  updateStealCountsLabel() {
    this.stealCountsLabel.setText(`Steal X: ${this.stealRemaining.X}   Steal O: ${this.stealRemaining.O}`)
  }

  updateStealUI() {
    const isArmed = this.stealArmedTeam === this.currentPlayer
    const powerArmed = this.powerArmedTeam === this.currentPlayer
    const shieldArmed = this.shieldArmedTeam === this.currentPlayer
    const trapArmed = this.trapArmedTeam === this.currentPlayer
    const hasSteal = this.stealRemaining[this.currentPlayer] > 0
    const hasTarget = this.hasValidStealTarget()
    const canActivate = !this.matchComplete && !this.stageLocked && !this.questionOpen && hasSteal && hasTarget && !isArmed && !powerArmed && !shieldArmed && !trapArmed

    if (isArmed) {
      this.stealStatusLabel.setText('Steal: Armed')
    } else if (hasSteal && !hasTarget) {
      this.stealStatusLabel.setText('Steal: No unprotected opponent square')
    } else if (hasSteal) {
      this.stealStatusLabel.setText('Steal: Available')
    } else {
      this.stealStatusLabel.setText('Steal: Used')
    }

    this.stealButton.label.setText(canActivate ? 'Activate Steal' : 'Steal Unavailable')

    if (canActivate) {
      this.stealButton.background.setInteractive({ useHandCursor: true })
      this.stealButton.background.setAlpha(1)
      this.stealButton.label.setAlpha(1)
    } else {
      this.stealButton.background.disableInteractive()
      this.stealButton.background.setAlpha(0.55)
      this.stealButton.label.setAlpha(0.75)
    }
  }

  updateTrapCountsLabel() {
    this.trapCountsLabel.setText(`Trap X: ${this.trapRemaining.X}   Trap O: ${this.trapRemaining.O}`)
  }

  updateTrapUI() {
    const isArmed = this.trapArmedTeam === this.currentPlayer
    const powerArmed = this.powerArmedTeam === this.currentPlayer
    const shieldArmed = this.shieldArmedTeam === this.currentPlayer
    const stealArmed = this.stealArmedTeam === this.currentPlayer
    const hasTrap = this.trapRemaining[this.currentPlayer] > 0
    const hasTarget = this.hasValidTrapTarget()
    const canActivate = !this.matchComplete && !this.stageLocked && !this.questionOpen && hasTrap && hasTarget && !isArmed && !powerArmed && !shieldArmed && !stealArmed

    if (isArmed) {
      this.trapStatusLabel.setText('Trap: Armed')
    } else if (hasTrap && !hasTarget) {
      this.trapStatusLabel.setText('Trap: No empty untrapped square')
    } else if (hasTrap) {
      this.trapStatusLabel.setText('Trap: Available')
    } else {
      this.trapStatusLabel.setText('Trap: Used')
    }

    this.trapButton.label.setText(canActivate ? 'Activate Trap' : 'Trap Unavailable')

    if (canActivate) {
      this.trapButton.background.setInteractive({ useHandCursor: true })
      this.trapButton.background.setAlpha(1)
      this.trapButton.label.setAlpha(1)
    } else {
      this.trapButton.background.disableInteractive()
      this.trapButton.background.setAlpha(0.55)
      this.trapButton.label.setAlpha(0.75)
    }
  }

  activatePower() {
    if (this.matchComplete || this.stageLocked || this.questionOpen || this.powerRemaining[this.currentPlayer] <= 0 || this.powerArmedTeam === this.currentPlayer || this.shieldArmedTeam === this.currentPlayer || this.stealArmedTeam === this.currentPlayer || this.trapArmedTeam === this.currentPlayer) {
      return
    }

    this.powerRemaining[this.currentPlayer] = 0
    this.powerArmedTeam = this.currentPlayer
    this.updateStageLabel()
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateStealUI()
    this.updateTrapUI()
  }

  activateShield() {
    if (this.matchComplete || this.stageLocked || this.questionOpen || this.shieldRemaining[this.currentPlayer] <= 0 || this.shieldArmedTeam === this.currentPlayer || this.powerArmedTeam === this.currentPlayer || this.stealArmedTeam === this.currentPlayer || this.trapArmedTeam === this.currentPlayer) {
      return
    }

    if (!this.hasValidShieldTarget()) {
      this.shieldStatusLabel.setText('Shield: No unprotected owned square')
      this.updateShieldUI()
      return
    }

    this.shieldArmedTeam = this.currentPlayer
    this.updateShieldUI()
    this.updatePowerUI()
    this.updateStealUI()
    this.updateTrapUI()
  }

  activateSteal() {
    if (this.matchComplete || this.stageLocked || this.questionOpen || this.stealRemaining[this.currentPlayer] <= 0 || this.stealArmedTeam === this.currentPlayer || this.powerArmedTeam === this.currentPlayer || this.shieldArmedTeam === this.currentPlayer || this.trapArmedTeam === this.currentPlayer) {
      return
    }

    if (!this.hasValidStealTarget()) {
      this.stealStatusLabel.setText('Steal: No unprotected opponent square')
      this.updateStealUI()
      return
    }

    this.stealArmedTeam = this.currentPlayer
    this.updateStealUI()
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateTrapUI()
  }

  activateTrap() {
    if (this.matchComplete || this.stageLocked || this.questionOpen || this.trapRemaining[this.currentPlayer] <= 0 || this.trapArmedTeam === this.currentPlayer || this.powerArmedTeam === this.currentPlayer || this.shieldArmedTeam === this.currentPlayer || this.stealArmedTeam === this.currentPlayer) {
      return
    }

    if (!this.hasValidTrapTarget()) {
      this.trapStatusLabel.setText('Trap: No empty untrapped square')
      this.updateTrapUI()
      return
    }

    this.trapArmedTeam = this.currentPlayer
    this.updateTrapUI()
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateStealUI()
  }

  switchTurn() {
    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X'
    this.powerArmedTeam = null
    this.shieldArmedTeam = null
    this.stealArmedTeam = null
    this.trapArmedTeam = null
    this.updateTurnLabel()
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateStealUI()
    this.updateTrapUI()
  }

  claimPendingCell() {
    if (this.resolveTrapForPendingCell()) {
      return
    }

    this.claimCellAtIndex(this.pendingCellIndex)
  }

  claimCellAtIndex(index) {
    const row = Math.floor(index / 3)
    const column = index % 3

    this.board[row][column] = this.currentPlayer
    this.createMark(index, this.currentPlayer)
    this.pendingCellIndex = null
    this.powerArmedTeam = null
    this.shieldArmedTeam = null
    this.stealArmedTeam = null
    this.trapArmedTeam = null
    this.trapSquares.delete(index)
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateStealUI()
    this.updateTrapUI()
    this.layoutBoard()

    if (this.getStageWinner(this.currentPlayer)) {
      this.declareStageWinner(this.currentPlayer)
      return
    }

    if (this.isBoardFull() && !this.hasAnyStageWinner()) {
      this.declareStageDraw()
      return
    }

    this.switchTurn()
  }

  resolveTrapForPendingCell() {
    const index = this.pendingCellIndex
    const trapOwner = this.trapSquares.get(index)

    if (!trapOwner) {
      return false
    }

    if (trapOwner === this.currentPlayer || !this.canFutureAbilityModifySquare(index)) {
      this.trapSquares.delete(index)
      return false
    }

    const row = Math.floor(index / 3)
    const column = index % 3

    this.board[row][column] = trapOwner
    this.createMark(index, trapOwner)
    this.trapSquares.delete(index)
    this.pendingCellIndex = null
    this.powerArmedTeam = null
    this.shieldArmedTeam = null
    this.stealArmedTeam = null
    this.trapArmedTeam = null
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateStealUI()
    this.updateTrapUI()
    this.layoutBoard()

    if (this.getStageWinner(trapOwner)) {
      this.declareStageWinner(trapOwner)
      return true
    }

    if (this.isBoardFull() && !this.hasAnyStageWinner()) {
      this.declareStageDraw()
      return true
    }

    this.switchTurn()

    return true
  }

  applyStealToCell(index) {
    if (!this.isSquareOwnedByOpponent(index) || !this.canFutureAbilityModifySquare(index)) {
      return
    }

    const row = Math.floor(index / 3)
    const column = index % 3

    this.board[row][column] = this.currentPlayer
    this.createMark(index, this.currentPlayer)
    this.stealRemaining[this.currentPlayer] = 0
    this.powerArmedTeam = null
    this.shieldArmedTeam = null
    this.stealArmedTeam = null
    this.trapArmedTeam = null
    this.trapSquares.delete(index)
    this.updateStealCountsLabel()
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateStealUI()
    this.updateTrapUI()
    this.layoutBoard()

    if (this.getStageWinner(this.currentPlayer)) {
      this.declareStageWinner(this.currentPlayer)
      return
    }

    if (this.isBoardFull() && !this.hasAnyStageWinner()) {
      this.declareStageDraw()
      return
    }

    this.switchTurn()
  }

  applyTrapToCell(index) {
    if (!this.isSquareEmpty(index) || this.trapSquares.has(index)) {
      return
    }

    this.trapSquares.set(index, this.currentPlayer)
    this.trapRemaining[this.currentPlayer] = 0
    this.powerArmedTeam = null
    this.shieldArmedTeam = null
    this.stealArmedTeam = null
    this.trapArmedTeam = null
    this.updateTrapCountsLabel()
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateStealUI()
    this.updateTrapUI()
    this.switchTurn()
  }

  applyShieldToCell(index) {
    if (!this.isSquareOwnedByCurrentTeam(index) || this.isSquareProtected(index)) {
      return
    }

    this.shieldRemaining[this.currentPlayer] = 0
    this.protectedSquares.add(index)
    this.createProtectedMarker(index)
    this.powerArmedTeam = null
    this.shieldArmedTeam = null
    this.stealArmedTeam = null
    this.trapArmedTeam = null
    this.updateShieldCountsLabel()
    this.updateShieldUI()
    this.updatePowerUI()
    this.updateStealUI()
    this.updateTrapUI()
    this.switchTurn()
  }

  isSquareEmpty(index) {
    const row = Math.floor(index / 3)
    const column = index % 3

    return this.board[row][column] === null
  }

  hasValidShieldTarget() {
    return this.board.some((row, rowIndex) =>
      row.some((cell, columnIndex) => {
        const index = rowIndex * 3 + columnIndex

        return cell === this.currentPlayer && !this.isSquareProtected(index)
      }),
    )
  }

  hasValidStealTarget() {
    return this.board.some((row, rowIndex) =>
      row.some((cell, columnIndex) => {
        const index = rowIndex * 3 + columnIndex

        return cell !== null && cell !== this.currentPlayer && this.canFutureAbilityModifySquare(index)
      }),
    )
  }

  hasValidTrapTarget() {
    return this.board.some((row, rowIndex) =>
      row.some((cell, columnIndex) => {
        const index = rowIndex * 3 + columnIndex

        return cell === null && !this.trapSquares.has(index)
      }),
    )
  }

  isSquareOwnedByCurrentTeam(index) {
    const row = Math.floor(index / 3)
    const column = index % 3

    return this.board[row][column] === this.currentPlayer
  }

  isSquareOwnedByOpponent(index) {
    const row = Math.floor(index / 3)
    const column = index % 3
    const owner = this.board[row][column]

    return owner !== null && owner !== this.currentPlayer
  }

  isSquareProtected(index) {
    return this.protectedSquares.has(index)
  }

  canFutureAbilityModifySquare(index) {
    return !this.isSquareProtected(index)
  }

  createProtectedMarker(index) {
    if (this.protectedMarkers[index]) {
      this.protectedMarkers[index].destroy()
    }

    const marker = this.add.circle(0, 0, 10, 0x7dd3fc, 0.3).setStrokeStyle(2, 0x7dd3fc, 1)
    marker.index = index
    this.protectedMarkers[index] = marker
  }

  positionProtectedMarkers(boardX, boardY, cellSize) {
    this.protectedMarkers.forEach((marker, index) => {
      if (!marker || !this.protectedSquares.has(index)) {
        return
      }

      const column = index % 3
      const row = Math.floor(index / 3)
      marker.setPosition(boardX + column * cellSize + 16, boardY + row * cellSize + 16)
      marker.setRadius(Math.max(8, cellSize * 0.08))
    })
  }

  resetStage() {
    this.board = this.createEmptyBoard()
    this.marks.forEach((mark) => mark.destroy())
    this.marks = []
    this.protectedMarkers.forEach((marker) => {
      if (marker) {
        marker.destroy()
      }
    })
    this.protectedMarkers = []
    this.protectedSquares.clear()
    this.trapSquares.clear()
    this.pendingCellIndex = null
    this.teamAnswers = this.createTeamAnswerState()
    this.stageLocked = false
    this.currentPlayer = 'X'
    this.powerArmedTeam = null
    this.shieldArmedTeam = null
    this.stealArmedTeam = null
    this.trapArmedTeam = null

    this.updateStageLabel()
    this.updateShieldCountsLabel()
    this.updateStealCountsLabel()
    this.updateTrapCountsLabel()
    this.updateTurnLabel()
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateStealUI()
    this.updateTrapUI()
    this.layoutBoard()
  }

  layoutBoard() {
    const { width, height } = this.scale
    const boardSize = Math.min(width * 0.78, height * 0.58, 460)
    const cellSize = boardSize / 3
    const boardX = (width - boardSize) / 2
    const boardY = (height - boardSize) / 2 + Math.min(height * 0.04, 28)
    const titleGap = Math.max(30, Math.min(52, boardSize * 0.12))

    this.drawBackground(width, height)
    this.title.setPosition(width / 2, boardY - titleGap)
    this.stageLabel.setPosition(width / 2, boardY - Math.max(16, titleGap * 0.38))
    this.shieldCountsLabel.setPosition(width / 2, this.stageLabel.y + 20)
    this.stealCountsLabel.setPosition(width / 2, this.shieldCountsLabel.y + 20)
    this.trapCountsLabel.setPosition(width / 2, this.stealCountsLabel.y + 20)
    this.turnLabel.setPosition(width / 2, boardY + boardSize + Math.max(32, boardSize * 0.1))
    this.powerStatusLabel.setPosition(width / 2, this.turnLabel.y + 28)
    this.powerButton.setPosition(width / 2, this.powerStatusLabel.y + 28)
    this.shieldStatusLabel.setPosition(width / 2, this.powerButton.y + 28)
    this.shieldButton.setPosition(width / 2, this.shieldStatusLabel.y + 28)
    this.stealStatusLabel.setPosition(width / 2, this.shieldButton.y + 28)
    this.stealButton.setPosition(width / 2, this.stealStatusLabel.y + 28)
    this.trapStatusLabel.setPosition(width / 2, this.stealButton.y + 28)
    this.trapButton.setPosition(width / 2, this.trapStatusLabel.y + 28)

    this.drawGrid(boardX, boardY, boardSize, cellSize)
    this.positionCells(boardX, boardY, cellSize)
    this.positionMarks(boardX, boardY, cellSize)
    this.positionProtectedMarkers(boardX, boardY, cellSize)
  }
}
