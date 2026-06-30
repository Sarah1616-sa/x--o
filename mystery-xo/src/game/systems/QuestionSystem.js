export class QuestionSystem {
  constructor({ questionBank, questionTimeLimit }) {
    this.questionBank = questionBank
    this.questionTimeLimit = questionTimeLimit
    this.questionIndex = 0
    this.questionOpen = false
    this.activeQuestion = null
    this.questionTimeRemaining = questionTimeLimit
    this.selectedAnswerIndex = null
    this.answererTurn = this.createAnswererState()
    this.activeAnswererTeam = null
    this.activeAnswererNumber = 1
  }

  createAnswererState() {
    return {
      X: 0,
      O: 0,
    }
  }

  resetAnswer() {
    this.selectedAnswerIndex = null
    return this.selectedAnswerIndex
  }

  resetAnswererRotation() {
    this.answererTurn = this.createAnswererState()
    this.activeAnswererTeam = null
    this.activeAnswererNumber = 1
  }

  resetQuestionIndex() {
    this.questionIndex = 0
  }

  getNextQuestion() {
    const question = this.questionBank[this.questionIndex % this.questionBank.length]
    this.questionIndex += 1
    return question
  }

  // Advances the rotating answerer for the team whose turn it is, so a different
  // teammate is the lone answerer each time that team is asked a question.
  rotateAnswerer(team, teamSize = 1) {
    const safeSize = Math.max(1, teamSize)
    const nextIndex = this.answererTurn[team] % safeSize
    this.answererTurn[team] = nextIndex + 1
    this.activeAnswererTeam = team
    this.activeAnswererNumber = nextIndex + 1
    return this.activeAnswererNumber
  }

  openQuestion(question, { team = null, teamSize = 1 } = {}) {
    this.questionOpen = true
    this.activeQuestion = question
    this.resetAnswer()
    this.questionTimeRemaining = this.questionTimeLimit

    if (team) {
      this.rotateAnswerer(team, teamSize)
    }
  }

  setAnswer(answerIndex) {
    if (!this.questionOpen) {
      return false
    }

    this.selectedAnswerIndex = answerIndex
    return true
  }

  getSelectedChoice() {
    if (this.selectedAnswerIndex === null || !this.activeQuestion) {
      return null
    }

    return this.activeQuestion.options[this.selectedAnswerIndex]
  }

  hasAnswer() {
    return this.selectedAnswerIndex !== null
  }

  isAnswerCorrect() {
    const correctAnswerIndex = this.activeQuestion?.correctAnswerIndex

    return this.hasAnswer() && this.selectedAnswerIndex === correctAnswerIndex
  }

  tickTimer() {
    if (!this.questionOpen) {
      return {
        questionOpen: false,
        expired: false,
        timeRemaining: this.questionTimeRemaining,
      }
    }

    this.questionTimeRemaining -= 1

    return {
      questionOpen: true,
      expired: this.questionTimeRemaining <= 0,
      timeRemaining: this.questionTimeRemaining,
    }
  }

  closeQuestion() {
    this.questionOpen = false
    this.activeQuestion = null
    this.resetAnswer()
    this.questionTimeRemaining = this.questionTimeLimit
  }
}
