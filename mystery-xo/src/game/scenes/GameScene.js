import Phaser from 'phaser'
import { socketService } from '../../network/socketService.js'
import { QUESTION_BANK } from '../data/questions.js'
import { ABILITY_NAMES } from '../constants/abilityNames.js'
import { MAX_STAGES, QUESTION_TIME_LIMIT } from '../constants/gameConstants.js'
import { QuestionSystem } from '../systems/QuestionSystem.js'
import { MatchSystem } from '../systems/MatchSystem.js'
import { AbilitySystem } from '../systems/AbilitySystem.js'
import { TurnResolver } from '../systems/TurnResolver.js'
import { BoardUI } from '../ui/BoardUI.js'
import { QuestionPanelUI } from '../ui/QuestionPanelUI.js'
import { AbilityBarUI } from '../ui/AbilityBarUI.js'
import { TeamPanelUI } from '../ui/TeamPanelUI.js'
import { MatchInfoUI } from '../ui/MatchInfoUI.js'
import { MatchEndUI } from '../ui/MatchEndUI.js'

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')
    this.bindAbilityState()
    this.bindMatchState()
    this.bindQuestionState()
  }

  create() {
    this.backgroundGraphics = this.add.graphics()
    this.gridGraphics = this.add.graphics()
    this.backgroundGraphics.setDepth(0)
    this.gridGraphics.setDepth(3)
    this.boardUI = new BoardUI(this, this.gridGraphics)
    this.abilityBarUI = new AbilityBarUI(this, {
      setTextWrap: this.setTextWrap.bind(this),
    })
    this.teamPanelUI = new TeamPanelUI(this, {
      drawLocalCard: this.drawLocalCard.bind(this),
      createPanelHeading: this.createPanelHeading.bind(this),
      setTextWrap: this.setTextWrap.bind(this),
    })
    this.matchInfoUI = new MatchInfoUI(this, {
      drawLocalCard: this.drawLocalCard.bind(this),
    })
    this.matchEndUI = new MatchEndUI(this)
    this.questionPanelUI = new QuestionPanelUI(this, {
      drawLocalCard: this.drawLocalCard.bind(this),
      createPanelHeading: this.createPanelHeading.bind(this),
      createPanelText: this.createPanelText.bind(this),
      setTextWrap: this.setTextWrap.bind(this),
    })
    this.board = this.createEmptyBoard()
    this.cells = this.boardUI.createCells((index) => {
      this.handleCellClick(index)
    })
    this.marks = []
    this.questionSystem = new QuestionSystem({
      questionBank: QUESTION_BANK,
      questionTimeLimit: QUESTION_TIME_LIMIT,
    })
    this.matchSystem = new MatchSystem({
      maxStages: MAX_STAGES,
    })
    this.abilitySystem = new AbilitySystem()
    this.currentPlayer = 'X'
    this.pendingCellIndex = null
    this.questionTimerEvent = null
    this.winningLines = this.createWinningLines()
    this.turnResolver = new TurnResolver({
      abilitySystem: this.abilitySystem,
      matchSystem: this.matchSystem,
      winningLines: this.winningLines,
    })
    this.protectedMarkers = []
    Object.assign(this, this.matchInfoUI.createUI())
    Object.assign(this, this.teamPanelUI.createUI())

    Object.assign(
      this,
      this.abilityBarUI.createUI({
        onActivatePower: () => this.activatePower(),
        onActivateShield: () => this.activateShield(),
        onActivateSteal: () => this.activateSteal(),
        onActivateTrap: () => this.activateTrap(),
      }),
    )
    this.abilityBarUI.bindReferences({
      powerCountsLabel: this.powerCountsLabel,
      shieldCountsLabel: this.shieldCountsLabel,
      stealCountsLabel: this.stealCountsLabel,
      trapCountsLabel: this.trapCountsLabel,
      powerStatusLabel: this.powerStatusLabel,
      shieldStatusLabel: this.shieldStatusLabel,
      stealStatusLabel: this.stealStatusLabel,
      trapStatusLabel: this.trapStatusLabel,
      powerButton: this.powerButton,
      shieldButton: this.shieldButton,
      stealButton: this.stealButton,
      trapButton: this.trapButton,
    })

    this.createLayoutContainers()
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
    this.setupMultiplayerSync()
  }

  createEmptyBoard() {
    return [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ]
  }

  createWinningLines() {
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

  bindAbilityState() {
    Object.defineProperties(this, {
      powerRemaining: {
        configurable: true,
        enumerable: true,
        get: () => this.abilitySystem?.powerRemaining ?? { X: 1, O: 1 },
        set: (value) => {
          if (this.abilitySystem) {
            this.abilitySystem.powerRemaining = value
          }
        },
      },
      powerArmedTeam: {
        configurable: true,
        enumerable: true,
        get: () => this.abilitySystem?.powerArmedTeam ?? null,
        set: (value) => {
          if (this.abilitySystem) {
            this.abilitySystem.powerArmedTeam = value
          }
        },
      },
      protectedSquares: {
        configurable: true,
        enumerable: true,
        get: () => this.abilitySystem?.protectedSquares ?? new Set(),
        set: (value) => {
          if (this.abilitySystem) {
            this.abilitySystem.protectedSquares = value
          }
        },
      },
      shieldArmedTeam: {
        configurable: true,
        enumerable: true,
        get: () => this.abilitySystem?.shieldArmedTeam ?? null,
        set: (value) => {
          if (this.abilitySystem) {
            this.abilitySystem.shieldArmedTeam = value
          }
        },
      },
      shieldRemaining: {
        configurable: true,
        enumerable: true,
        get: () => this.abilitySystem?.shieldRemaining ?? { X: 1, O: 1 },
        set: (value) => {
          if (this.abilitySystem) {
            this.abilitySystem.shieldRemaining = value
          }
        },
      },
      stealArmedTeam: {
        configurable: true,
        enumerable: true,
        get: () => this.abilitySystem?.stealArmedTeam ?? null,
        set: (value) => {
          if (this.abilitySystem) {
            this.abilitySystem.stealArmedTeam = value
          }
        },
      },
      stealRemaining: {
        configurable: true,
        enumerable: true,
        get: () => this.abilitySystem?.stealRemaining ?? { X: 1, O: 1 },
        set: (value) => {
          if (this.abilitySystem) {
            this.abilitySystem.stealRemaining = value
          }
        },
      },
      trapArmedTeam: {
        configurable: true,
        enumerable: true,
        get: () => this.abilitySystem?.trapArmedTeam ?? null,
        set: (value) => {
          if (this.abilitySystem) {
            this.abilitySystem.trapArmedTeam = value
          }
        },
      },
      trapRemaining: {
        configurable: true,
        enumerable: true,
        get: () => this.abilitySystem?.trapRemaining ?? { X: 1, O: 1 },
        set: (value) => {
          if (this.abilitySystem) {
            this.abilitySystem.trapRemaining = value
          }
        },
      },
      trapSquares: {
        configurable: true,
        enumerable: true,
        get: () => this.abilitySystem?.trapSquares ?? new Map(),
        set: (value) => {
          if (this.abilitySystem) {
            this.abilitySystem.trapSquares = value
          }
        },
      },
    })
  }

  bindMatchState() {
    Object.defineProperties(this, {
      currentStage: {
        configurable: true,
        enumerable: true,
        get: () => this.matchSystem?.currentStage ?? 1,
        set: (value) => {
          if (this.matchSystem) {
            this.matchSystem.currentStage = value
          }
        },
      },
      matchComplete: {
        configurable: true,
        enumerable: true,
        get: () => this.matchSystem?.matchComplete ?? false,
        set: (value) => {
          if (this.matchSystem) {
            this.matchSystem.matchComplete = value
          }
        },
      },
      maxStages: {
        configurable: true,
        enumerable: true,
        get: () => this.matchSystem?.maxStages ?? MAX_STAGES,
        set: (value) => {
          if (this.matchSystem) {
            this.matchSystem.maxStages = value
          }
        },
      },
      stageLocked: {
        configurable: true,
        enumerable: true,
        get: () => this.matchSystem?.stageLocked ?? false,
        set: (value) => {
          if (this.matchSystem) {
            this.matchSystem.stageLocked = value
          }
        },
      },
      stageScores: {
        configurable: true,
        enumerable: true,
        get: () => this.matchSystem?.stageScores ?? { X: 0, O: 0 },
        set: (value) => {
          if (this.matchSystem) {
            this.matchSystem.stageScores = value
          }
        },
      },
    })
  }

  bindQuestionState() {
    Object.defineProperties(this, {
      activeQuestion: {
        configurable: true,
        enumerable: true,
        get: () => this.questionSystem?.activeQuestion ?? null,
        set: (value) => {
          if (this.questionSystem) {
            this.questionSystem.activeQuestion = value
          }
        },
      },
      questionBank: {
        configurable: true,
        enumerable: true,
        get: () => this.questionSystem?.questionBank ?? [],
        set: (value) => {
          if (this.questionSystem) {
            this.questionSystem.questionBank = value
          }
        },
      },
      questionIndex: {
        configurable: true,
        enumerable: true,
        get: () => this.questionSystem?.questionIndex ?? 0,
        set: (value) => {
          if (this.questionSystem) {
            this.questionSystem.questionIndex = value
          }
        },
      },
      questionOpen: {
        configurable: true,
        enumerable: true,
        get: () => this.questionSystem?.questionOpen ?? false,
        set: (value) => {
          if (this.questionSystem) {
            this.questionSystem.questionOpen = value
          }
        },
      },
      questionTimeRemaining: {
        configurable: true,
        enumerable: true,
        get: () => this.questionSystem?.questionTimeRemaining ?? QUESTION_TIME_LIMIT,
        set: (value) => {
          if (this.questionSystem) {
            this.questionSystem.questionTimeRemaining = value
          }
        },
      },
      teamAnswers: {
        configurable: true,
        enumerable: true,
        get: () => this.questionSystem?.teamAnswers ?? { captain: null, partner: null },
        set: (value) => {
          if (this.questionSystem) {
            this.questionSystem.teamAnswers = value
          }
        },
      },
    })
  }

  createLayoutContainers() {
    this.centerPanel = this.createPanelContainer(1)
    this.topBarPanel = this.createPanelContainer(5)
    this.leftPanel = this.createPanelContainer(5)
    this.rightPanel = this.createPanelContainer(5)
    this.bottomPanel = this.createPanelContainer(5)
    this.topBarPanel.container.add([
      this.stageCardGraphics,
      this.teamXCardGraphics,
      this.teamOCardGraphics,
      this.title,
      this.stageLabel,
      this.teamXScoreLabel,
      this.teamOScoreLabel,
    ])
    this.leftPanel.container.add([
      this.currentTeamCardGraphics,
      this.resourceCardGraphics,
      this.statusCardGraphics,
      this.currentTeamHeading,
      this.turnLabel,
      this.resourcesHeading,
      this.powerCountsLabel,
      this.shieldCountsLabel,
      this.stealCountsLabel,
      this.trapCountsLabel,
      this.abilityStatusHeading,
      this.powerStatusLabel,
      this.shieldStatusLabel,
      this.stealStatusLabel,
      this.trapStatusLabel,
    ])
    this.rightPanel.container.add(this.questionPanelUI.createSidebarElements())
    this.bottomPanel.container.add([this.powerButton, this.shieldButton, this.stealButton, this.trapButton])
  }

  createPanelContainer(depth) {
    const container = this.add.container(0, 0).setDepth(depth)
    const graphics = this.add.graphics()

    container.add(graphics)

    return {
      container,
      graphics,
      width: 0,
      height: 0,
    }
  }

  createPanelHeading(text) {
    return this.add
      .text(0, 0, text, {
        color: '#ff3355',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        align: 'center',
        rtl: true,
      })
      .setOrigin(0.5)
  }

  createPanelText(text, fontSize = 15, color = '#ffffff') {
    return this.add
      .text(0, 0, text, {
        color,
        fontFamily: 'Arial, sans-serif',
        fontSize: `${fontSize}px`,
        align: 'center',
        rtl: true,
        wordWrap: { width: 260 },
      })
      .setOrigin(0.5)
  }

  drawPanel(panel, x, y, width, height, accent = 'top') {
    const graphics = panel.graphics

    panel.container.setPosition(x, y)
    panel.width = width
    panel.height = height
    graphics.clear()
    graphics.fillStyle(0x070b14, 0.92)
    graphics.fillRoundedRect(0, 0, width, height, 8)
    graphics.lineStyle(1, 0xff3355, 0.55)
    graphics.strokeRoundedRect(0.5, 0.5, width - 1, height - 1, 8)
    graphics.lineStyle(1, 0xffffff, 0.08)
    graphics.strokeRoundedRect(5.5, 5.5, width - 11, height - 11, 6)
    graphics.fillStyle(0xff3355, 0.95)

    if (accent === 'left') {
      graphics.fillRect(0, 18, 3, Math.max(0, height - 36))
      return
    }

    graphics.fillRect(18, 0, Math.max(0, width - 36), 3)
  }

  drawLocalCard(graphics, x, y, width, height, options = {}) {
    const fillColor = options.fillColor ?? 0x0b1220
    const fillAlpha = options.fillAlpha ?? 0.84
    const strokeColor = options.strokeColor ?? 0xff3355
    const strokeAlpha = options.strokeAlpha ?? 0.45
    const radius = options.radius ?? 8

    graphics.clear()
    graphics.fillStyle(fillColor, fillAlpha)
    graphics.fillRoundedRect(x, y, width, height, radius)
    graphics.lineStyle(1, strokeColor, strokeAlpha)
    graphics.strokeRoundedRect(x + 0.5, y + 0.5, width - 1, height - 1, radius)

    if (options.accent !== false) {
      graphics.fillStyle(strokeColor, 0.92)
      graphics.fillRect(x + 12, y, Math.max(0, width - 24), 2)
    }
  }

  setTextWrap(textObject, width) {
    if (textObject && textObject.setWordWrapWidth) {
      textObject.setWordWrapWidth(Math.max(120, width))
    }
  }

  setQuestionIdleVisible(isVisible) {
    this.questionPanelUI.setIdleVisible(isVisible)
  }

  updateQuestionResult(message) {
    this.questionPanelUI.setResultText(message)
  }

  updateAnswerButtonStates(role) {
    this.questionPanelUI.updateAnswerButtonStates(role, this.teamAnswers[role])
  }

  handleCellClick(index) {
    if (this.isMultiplayerMode) {
      try {
        socketService.selectCell(index)
      } catch (error) {
        console.error(error)
      }
      return
    }

    this.applyTurnResult(
      this.turnResolver.handleCellClick({
        index,
        board: this.board,
        currentPlayer: this.currentPlayer,
        matchComplete: this.matchComplete,
        stageLocked: this.stageLocked,
        questionOpen: this.questionOpen,
      }),
    )
  }

  createMark(index, player) {
    this.boardUI.createMark(this.marks, index, player)
  }

  showQuestionModal(question) {
    this.questionSystem.openQuestion(question)
    this.setQuestionIdleVisible(false)
    this.updateQuestionResult('النتيجة: بانتظار الإجابات')

    this.renderQuestionPanel(question)
    this.startQuestionTimer()
  }

  renderQuestionPanel(question) {
    this.questionPanelUI.renderQuestionPanel({
      rightPanel: this.rightPanel,
      question,
      questionTimeRemaining: this.questionTimeRemaining,
      onSelectAnswer: (role, answerIndex) => {
        this.selectTeamAnswer(role, answerIndex)
      },
      onSubmit: () => {
        this.submitTeamAnswers()
      },
    })
    this.refreshSelectedAnswerLabels()
  }

  refreshSelectedAnswerLabels() {
    this.questionPanelUI.refreshSelectedAnswers(this.teamAnswers, (role) => this.questionSystem.getSelectedChoice(role))
  }

  selectTeamAnswer(role, answerIndex) {
    if (!this.questionSystem.setTeamAnswer(role, answerIndex)) {
      return
    }
    this.updateSelectedAnswerLabel(role)
  }

  updateSelectedAnswerLabel(role) {
    const choice = this.questionSystem.getSelectedChoice(role)
    this.questionPanelUI.updateSelectedAnswer(role, choice)
    this.updateAnswerButtonStates(role)
  }

  submitTeamAnswers() {
    if (!this.questionOpen || !this.questionSystem.hasBothTeamAnswers()) {
      return
    }

    this.stopQuestionTimer()
    const isCorrect = this.questionSystem.areTeamAnswersCorrect()

    this.updateQuestionResult(isCorrect ? 'النتيجة: إجابة صحيحة' : 'النتيجة: إجابة غير صحيحة')
    this.closeQuestionModal()

    if (isCorrect) {
      this.applyTurnResult(
        this.turnResolver.resolvePendingCell({
          board: this.board,
          pendingCellIndex: this.pendingCellIndex,
          currentPlayer: this.currentPlayer,
        }),
      )
      return
    }

    this.pendingCellIndex = null
    this.applyTurnResult(this.turnResolver.resolveIncorrectAnswer())
  }

  closeQuestionModal() {
    this.stopQuestionTimer()
    this.questionPanelUI.destroyQuestionModal()
    this.questionSystem.closeQuestion()
    this.setQuestionIdleVisible(true)
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

    const { expired, timeRemaining } = this.questionSystem.tickTimer()
    this.questionPanelUI.updateTimerText(timeRemaining)

    if (expired) {
      this.handleQuestionTimeout()
    }
  }

  handleQuestionTimeout() {
    if (!this.questionOpen) {
      return
    }

    this.pendingCellIndex = null
    this.updateQuestionResult('النتيجة: انتهى الوقت')
    this.closeQuestionModal()
    this.applyTurnResult(this.turnResolver.resolveQuestionTimeout())
  }

  declareStageWinner(player) {
    this.matchSystem.lockStage()
    this.turnLabel.setText(`فاز الفريق ${player} بالجولة`)
    this.awardStagePoint(player)
    this.updateAbilityUI()

    this.time.delayedCall(2000, () => {
      this.advanceStageOrFinishMatch()
    })
  }

  declareStageDraw() {
    this.matchSystem.lockStage()
    this.turnLabel.setText('تعادل الجولة')
    this.updateAbilityUI()

    this.time.delayedCall(2000, () => {
      this.advanceStageOrFinishMatch()
    })
  }

  awardStagePoint(player) {
    this.matchSystem.awardStagePoint(player)
    this.updateStageLabel()
  }

  advanceStageOrFinishMatch() {
    const { matchComplete } = this.matchSystem.advanceStageOrCompleteMatch()
    if (matchComplete) {
      this.completeMatch()
      return
    }

    this.resetStage()
  }

  completeMatch() {
    this.updateAbilityUI()
    const winner = this.matchSystem.getMatchWinner()

    if (!winner) {
      this.turnLabel.setText('تعادل')
      this.showMatchEndScreen(winner)
      return
    }

    this.turnLabel.setText(`فاز الفريق ${winner} بالمباراة`)
    this.showMatchEndScreen(winner)
  }

  showMatchEndScreen(winner) {
    this.matchEndUI.show({
      winner,
      stageScores: this.stageScores,
      onPlayAgain: () => this.resetMatch(),
      onReturnToMenu: () => this.returnToMainMenu(),
      width: this.scale.width,
      height: this.scale.height,
    })
  }

  layoutMatchEndOverlay(width, height) {
    this.matchEndUI.layout(width, height)
  }

  hideMatchEndScreen() {
    this.matchEndUI.hide()
  }

  resetMatch() {
    this.hideMatchEndScreen()
    this.closeQuestionModal()
    this.matchSystem.resetMatchState()
    this.abilitySystem.resetMatchState()
    this.questionSystem.resetQuestionIndex()
    this.updateQuestionResult('النتيجة: بانتظار السؤال')
    this.resetStage()
  }

  returnToMainMenu() {
    if (this.scene.manager.keys.MainMenu) {
      this.scene.start('MainMenu')
      return
    }

    this.scene.restart()
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

  updateTurnLabel() {
    this.teamPanelUI.updateTurnLabel(this.turnLabel, this.currentPlayer)
  }

  updateStageLabel() {
    this.matchInfoUI.updateMatchInfo(
      this.stageLabel,
      this.teamXScoreLabel,
      this.teamOScoreLabel,
      this.currentStage,
      this.maxStages,
      this.stageScores,
    )
    this.abilityBarUI.updateCounts(this, {
      power: this.powerRemaining,
      shield: this.shieldRemaining,
      steal: this.stealRemaining,
      trap: this.trapRemaining,
    })
  }

  updateAbilityUI() {
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateStealUI()
    this.updateTrapUI()
  }

  updatePowerUI() {
    const isArmed = this.powerArmedTeam === this.currentPlayer
    const hasPower = this.powerRemaining[this.currentPlayer] > 0
    const canActivate = this.abilitySystem.canActivatePower({
      currentPlayer: this.currentPlayer,
      matchComplete: this.matchComplete,
      stageLocked: this.stageLocked,
      questionOpen: this.questionOpen,
    })

    const statusText = isArmed
      ? `القوة: مفعلة للفريق ${this.currentPlayer}`
      : hasPower
        ? `القوة: متاحة للفريق ${this.currentPlayer}`
        : `القوة: غير متاحة للفريق ${this.currentPlayer}`

    this.abilityBarUI.updateAbilityState({
      statusLabel: this.powerStatusLabel,
      button: this.powerButton,
      statusText,
      buttonText: canActivate ? `تفعيل ${ABILITY_NAMES.power}` : `${ABILITY_NAMES.power} غير متاح`,
      canActivate,
      strokeColor: 0xff3355,
    })
  }

  updateShieldCountsLabel() {
    this.abilityBarUI.updateCounts(this, {
      power: this.powerRemaining,
      shield: this.shieldRemaining,
      steal: this.stealRemaining,
      trap: this.trapRemaining,
    })
  }

  updateShieldUI() {
    const isArmed = this.shieldArmedTeam === this.currentPlayer
    const hasShield = this.shieldRemaining[this.currentPlayer] > 0
    const hasTarget = this.abilitySystem.hasValidShieldTarget(this.board, this.currentPlayer)
    const canActivate = this.abilitySystem.canActivateShield({
      board: this.board,
      currentPlayer: this.currentPlayer,
      matchComplete: this.matchComplete,
      stageLocked: this.stageLocked,
      questionOpen: this.questionOpen,
    })

    const statusText = isArmed
      ? `الدرع: مفعّل للفريق ${this.currentPlayer}`
      : hasShield && !hasTarget
        ? 'الدرع: لا توجد خانة مملوكة غير محمية'
        : hasShield
          ? `الدرع: متاح للفريق ${this.currentPlayer}`
          : `الدرع: مستخدم للفريق ${this.currentPlayer}`

    this.abilityBarUI.updateAbilityState({
      statusLabel: this.shieldStatusLabel,
      button: this.shieldButton,
      statusText,
      buttonText: canActivate ? `تفعيل ${ABILITY_NAMES.shield}` : `${ABILITY_NAMES.shield} غير متاح`,
      canActivate,
      strokeColor: 0x7dd3fc,
    })
  }

  updateStealCountsLabel() {
    this.abilityBarUI.updateCounts(this, {
      power: this.powerRemaining,
      shield: this.shieldRemaining,
      steal: this.stealRemaining,
      trap: this.trapRemaining,
    })
  }

  updateStealUI() {
    const isArmed = this.stealArmedTeam === this.currentPlayer
    const hasSteal = this.stealRemaining[this.currentPlayer] > 0
    const hasTarget = this.abilitySystem.hasValidStealTarget(this.board, this.currentPlayer)
    const canActivate = this.abilitySystem.canActivateSteal({
      board: this.board,
      currentPlayer: this.currentPlayer,
      matchComplete: this.matchComplete,
      stageLocked: this.stageLocked,
      questionOpen: this.questionOpen,
    })

    const statusText = isArmed
      ? `السرقة: مفعّلة للفريق ${this.currentPlayer}`
      : hasSteal && !hasTarget
        ? 'السرقة: لا توجد خانة خصم غير محمية'
        : hasSteal
          ? `السرقة: متاحة للفريق ${this.currentPlayer}`
          : `السرقة: مستخدمة للفريق ${this.currentPlayer}`

    this.abilityBarUI.updateAbilityState({
      statusLabel: this.stealStatusLabel,
      button: this.stealButton,
      statusText,
      buttonText: canActivate ? `تفعيل ${ABILITY_NAMES.steal}` : `${ABILITY_NAMES.steal} غير متاح`,
      canActivate,
      strokeColor: 0x34d399,
    })
  }

  updateTrapCountsLabel() {
    this.abilityBarUI.updateCounts(this, {
      power: this.powerRemaining,
      shield: this.shieldRemaining,
      steal: this.stealRemaining,
      trap: this.trapRemaining,
    })
  }

  updateTrapUI() {
    const isArmed = this.trapArmedTeam === this.currentPlayer
    const hasTrap = this.trapRemaining[this.currentPlayer] > 0
    const hasTarget = this.abilitySystem.hasValidTrapTarget(this.board)
    const canActivate = this.abilitySystem.canActivateTrap({
      board: this.board,
      currentPlayer: this.currentPlayer,
      matchComplete: this.matchComplete,
      stageLocked: this.stageLocked,
      questionOpen: this.questionOpen,
    })

    const statusText = isArmed
      ? `الفخ: مفعّل للفريق ${this.currentPlayer}`
      : hasTrap && !hasTarget
        ? 'الفخ: لا توجد خانة فارغة بلا فخ'
        : hasTrap
          ? `الفخ: متاح للفريق ${this.currentPlayer}`
          : `الفخ: مستخدم للفريق ${this.currentPlayer}`

    this.abilityBarUI.updateAbilityState({
      statusLabel: this.trapStatusLabel,
      button: this.trapButton,
      statusText,
      buttonText: canActivate ? `تفعيل ${ABILITY_NAMES.trap}` : `${ABILITY_NAMES.trap} غير متاح`,
      canActivate,
      strokeColor: 0xfb923c,
    })
  }

  activatePower() {
    if (!this.abilitySystem.canActivatePower({
      currentPlayer: this.currentPlayer,
      matchComplete: this.matchComplete,
      stageLocked: this.stageLocked,
      questionOpen: this.questionOpen,
    })) {
      return
    }

    this.abilitySystem.activatePower(this.currentPlayer)
    this.updateStageLabel()
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateStealUI()
    this.updateTrapUI()
  }

  activateShield() {
    if (!this.abilitySystem.canActivateShield({
      board: this.board,
      currentPlayer: this.currentPlayer,
      matchComplete: this.matchComplete,
      stageLocked: this.stageLocked,
      questionOpen: this.questionOpen,
    })) {
      return
    }

    if (!this.abilitySystem.hasValidShieldTarget(this.board, this.currentPlayer)) {
      this.shieldStatusLabel.setText('الدرع: لا توجد خانة مملوكة غير محمية')
      this.updateShieldUI()
      return
    }

    this.abilitySystem.activateShield(this.currentPlayer)
    this.updateShieldUI()
    this.updatePowerUI()
    this.updateStealUI()
    this.updateTrapUI()
  }

  activateSteal() {
    if (!this.abilitySystem.canActivateSteal({
      board: this.board,
      currentPlayer: this.currentPlayer,
      matchComplete: this.matchComplete,
      stageLocked: this.stageLocked,
      questionOpen: this.questionOpen,
    })) {
      return
    }

    if (!this.abilitySystem.hasValidStealTarget(this.board, this.currentPlayer)) {
      this.stealStatusLabel.setText('السرقة: لا توجد خانة خصم غير محمية')
      this.updateStealUI()
      return
    }

    this.abilitySystem.activateSteal(this.currentPlayer)
    this.updateStealUI()
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateTrapUI()
  }

  activateTrap() {
    if (!this.abilitySystem.canActivateTrap({
      board: this.board,
      currentPlayer: this.currentPlayer,
      matchComplete: this.matchComplete,
      stageLocked: this.stageLocked,
      questionOpen: this.questionOpen,
    })) {
      return
    }

    if (!this.abilitySystem.hasValidTrapTarget(this.board)) {
      this.trapStatusLabel.setText('الفخ: لا توجد خانة فارغة بلا فخ')
      this.updateTrapUI()
      return
    }

    this.abilitySystem.activateTrap(this.currentPlayer)
    this.updateTrapUI()
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateStealUI()
  }

  switchTurn() {
    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X'
    this.abilitySystem.clearArmedAbilities()
    this.updateTurnLabel()
    this.updatePowerUI()
    this.updateShieldUI()
    this.updateStealUI()
    this.updateTrapUI()
  }

  applyTurnResult(result) {
    if (!result) {
      return
    }

    switch (result.type) {
      case 'OPEN_QUESTION':
        this.pendingCellIndex = result.cellIndex
        this.showQuestionModal(this.questionSystem.getNextQuestion())
        return
      case 'CLAIM_CELL':
      case 'POWER_CLAIM':
        this.applyClaimResult(result)
        return
      case 'TRAP_TRIGGER':
        this.applyTrapTriggerResult(result)
        return
      case 'APPLY_STEAL':
        this.applyStealResult(result)
        return
      case 'APPLY_SHIELD':
        this.applyShieldResult(result)
        return
      case 'PLACE_TRAP':
        this.applyTrapPlacementResult(result)
        return
      case 'SWITCH_TURN':
        this.switchTurn()
        return
      case 'STAGE_WIN':
        this.declareStageWinner(result.team)
        return
      case 'STAGE_DRAW':
        this.declareStageDraw()
        return
      case 'INVALID_TARGET':
        return
      default:
        return
    }
  }

  applyClaimResult(result) {
    const { cellIndex, team } = result
    const row = Math.floor(cellIndex / 3)
    const column = cellIndex % 3

    this.board[row][column] = team
    this.createMark(cellIndex, team)
    this.pendingCellIndex = null
    this.abilitySystem.consumeClaimAt(cellIndex)
    this.refreshResolvedMoveUI({ shouldLayoutBoard: true })
    this.applyBoardOutcome(team)
  }

  applyTrapTriggerResult(result) {
    const { cellIndex, team } = result
    const row = Math.floor(cellIndex / 3)
    const column = cellIndex % 3

    this.board[row][column] = team
    this.createMark(cellIndex, team)
    this.pendingCellIndex = null
    this.abilitySystem.resolveTrapForPendingCell(cellIndex, this.currentPlayer)
    this.refreshResolvedMoveUI({ shouldLayoutBoard: true })
    this.applyBoardOutcome(team)
  }

  applyStealResult(result) {
    const { cellIndex, team } = result
    const row = Math.floor(cellIndex / 3)
    const column = cellIndex % 3

    this.board[row][column] = team
    this.createMark(cellIndex, team)
    this.abilitySystem.consumeSteal(this.currentPlayer, cellIndex)
    this.refreshResolvedMoveUI({ shouldLayoutBoard: true })
    this.applyBoardOutcome(team)
  }

  applyShieldResult(result) {
    this.abilitySystem.consumeShield(this.currentPlayer, result.cellIndex)
    this.createProtectedMarker(result.cellIndex)
    this.refreshResolvedMoveUI({ shouldLayoutBoard: true })
    this.applyTurnResult(this.turnResolver.createSwitchTurnResult('SHIELD_APPLIED'))
  }

  applyTrapPlacementResult(result) {
    this.abilitySystem.consumeTrapPlacement(this.currentPlayer, result.cellIndex)
    this.refreshResolvedMoveUI()
    this.applyTurnResult(this.turnResolver.createSwitchTurnResult('TRAP_PLACED'))
  }

  applyBoardOutcome(team) {
    this.applyTurnResult(this.turnResolver.resolveBoardOutcome(this.board, team))
  }

  refreshResolvedMoveUI({ shouldLayoutBoard = false } = {}) {
    this.abilityBarUI.updateCounts(this, {
      power: this.powerRemaining,
      shield: this.shieldRemaining,
      steal: this.stealRemaining,
      trap: this.trapRemaining,
    })
    this.updateAbilityUI()

    if (shouldLayoutBoard) {
      this.layoutBoard()
    }
  }

  createProtectedMarker(index) {
    if (this.protectedMarkers[index]) {
      this.protectedMarkers[index].destroy()
    }

    const marker = this.add.circle(0, 0, 10, 0x7dd3fc, 0.3).setStrokeStyle(2, 0x7dd3fc, 1).setDepth(4)
    marker.index = index
    this.protectedMarkers[index] = marker
  }

  setupMultiplayerSync() {
    this.isMultiplayerMode = socketService.isMultiplayerActive?.() ?? false
    this.multiplayerUnsubscribers = []

    if (!this.isMultiplayerMode) {
      return
    }

    this.disableLocalMultiplayerUnsupportedUI()
    this.applyServerGameSnapshot(socketService.getGameSnapshot())

    const listen = (event, handler) => {
      const unsubscribe = socketService.on(event, handler)
      this.multiplayerUnsubscribers.push(unsubscribe)
    }

    listen('game:snapshot', (payload) => {
      this.applyServerGameSnapshot(payload?.game ?? payload?.room?.game)
    })

    listen('board:update', (payload) => {
      this.applyServerGameSnapshot(payload?.game ?? payload?.room?.game)
    })

    listen('turn:started', (payload) => {
      this.applyServerGameSnapshot(payload?.game ?? payload?.room?.game)
    })

    listen('stage:end', (payload) => {
      const game = payload?.game ?? payload?.room?.game
      this.applyServerGameSnapshot(game)
      this.turnLabel.setText(payload?.winner ? `فاز الفريق ${payload.winner} بالجولة` : 'تعادل الجولة')
    })

    listen('match:end', (payload) => {
      const game = payload?.game ?? payload?.room?.game
      this.applyServerGameSnapshot(game)
      this.showMatchEndScreen(payload?.winner ?? null)
    })

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.multiplayerUnsubscribers?.forEach((unsubscribe) => unsubscribe())
      this.multiplayerUnsubscribers = []
    })
  }

  disableLocalMultiplayerUnsupportedUI() {
    const unsupportedButtons = [
      this.powerButton,
      this.shieldButton,
      this.stealButton,
      this.trapButton,
    ]

    unsupportedButtons.forEach((button) => {
      if (button?.disableInteractive) {
        button.disableInteractive()
        if (button.setAlpha) {
          button.setAlpha(0.35)
        }
      }
    })

    this.updateQuestionResult('Multiplayer board sync mode')
  }

  applyServerGameSnapshot(game) {
    if (!game) {
      return
    }

    this.currentPlayer = game.currentTurnTeam ?? 'X'
    this.currentStage = game.currentStage ?? 1
    this.maxStages = game.maxStages ?? this.maxStages
    this.stageScores = game.stageScores ?? { X: 0, O: 0 }

    this.board = this.flatBoardToMatrix(game.board ?? Array(9).fill(null))

    this.marks.forEach((mark) => mark.destroy())
    this.marks = []

    ;(game.board ?? []).forEach((value, index) => {
      if (value) {
        this.createMark(index, value)
      }
    })

    this.updateTurnLabel()
    this.updateStageLabel()
    this.layoutBoard()
  }

  flatBoardToMatrix(flatBoard) {
    return [
      [flatBoard[0] ?? null, flatBoard[1] ?? null, flatBoard[2] ?? null],
      [flatBoard[3] ?? null, flatBoard[4] ?? null, flatBoard[5] ?? null],
      [flatBoard[6] ?? null, flatBoard[7] ?? null, flatBoard[8] ?? null],
    ]
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
    this.abilitySystem.resetStageState()
    this.pendingCellIndex = null
    this.questionSystem.resetTeamAnswers()
    this.matchSystem.resetStageState()
    this.currentPlayer = 'X'

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
    const margin = Math.max(20, Math.min(28, width * 0.015))
    const gap = Math.max(18, Math.min(28, width * 0.014))
    const topBarHeight = 74
    const bottomBarHeight = 96
    const topBarX = margin
    const topBarY = 18
    const topBarWidth = width - margin * 2
    const panelTop = topBarY + topBarHeight + 18
    const bottomPanelY = height - bottomBarHeight - margin
    const sidePanelHeight = bottomPanelY - panelTop - gap
    const leftPanelWidth = Math.min(330, Math.max(290, width * 0.18))
    const rightPanelWidth = Math.min(410, Math.max(350, width * 0.21))
    const leftPanelX = margin
    const rightPanelX = width - margin - rightPanelWidth
    const centerPanelX = leftPanelX + leftPanelWidth + gap
    const centerPanelWidth = rightPanelX - gap - centerPanelX
    const centerPanelHeight = sidePanelHeight
    const { boardSize, cellSize, boardX, boardY } = this.boardUI.getLayout({
      centerPanelX,
      panelTop,
      centerPanelWidth,
      centerPanelHeight,
    })
    const bottomPanelWidth = width - margin * 2

    this.drawBackground(width, height)
    this.drawPanel(this.topBarPanel, topBarX, topBarY, topBarWidth, topBarHeight)
    this.drawPanel(this.leftPanel, leftPanelX, panelTop, leftPanelWidth, sidePanelHeight, 'left')
    this.drawPanel(this.centerPanel, centerPanelX, panelTop, centerPanelWidth, centerPanelHeight)
    this.drawPanel(this.rightPanel, rightPanelX, panelTop, rightPanelWidth, sidePanelHeight, 'left')
    this.drawPanel(this.bottomPanel, margin, bottomPanelY, bottomPanelWidth, bottomBarHeight)
    this.matchInfoUI.layout({
      topBarWidth,
      currentPlayer: this.currentPlayer,
      stageCardGraphics: this.stageCardGraphics,
      teamXCardGraphics: this.teamXCardGraphics,
      teamOCardGraphics: this.teamOCardGraphics,
      title: this.title,
      stageLabel: this.stageLabel,
      teamXScoreLabel: this.teamXScoreLabel,
      teamOScoreLabel: this.teamOScoreLabel,
    })
    this.teamPanelUI.layout({
      leftPanelWidth,
      currentPlayer: this.currentPlayer,
      currentTeamCardGraphics: this.currentTeamCardGraphics,
      resourceCardGraphics: this.resourceCardGraphics,
      statusCardGraphics: this.statusCardGraphics,
      currentTeamHeading: this.currentTeamHeading,
      resourcesHeading: this.resourcesHeading,
      abilityStatusHeading: this.abilityStatusHeading,
      turnLabel: this.turnLabel,
    })
    this.questionPanelUI.layoutSidebar(rightPanelWidth, sidePanelHeight)
    this.abilityBarUI.layoutSidebar(leftPanelWidth)

    this.abilityBarUI.layoutBottomBar(bottomPanelWidth, bottomBarHeight)

    if (this.questionOpen && this.activeQuestion) {
      this.setQuestionIdleVisible(false)
      this.renderQuestionPanel(this.activeQuestion)
    }

    this.boardUI.layout({
      boardX,
      boardY,
      boardSize,
      cellSize,
      cells: this.cells,
      marks: this.marks,
      protectedMarkers: this.protectedMarkers,
      protectedSquares: this.protectedSquares,
    })
    this.layoutMatchEndOverlay(width, height)
  }
}