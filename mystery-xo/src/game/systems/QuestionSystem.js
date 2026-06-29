export class QuestionSystem {
  constructor({ questionBank, questionTimeLimit }) {
    this.questionBank = questionBank
    this.questionTimeLimit = questionTimeLimit
    this.questionIndex = 0
    this.questionOpen = false
    this.activeQuestion = null
    this.questionTimeRemaining = questionTimeLimit
    this.teamAnswers = this.createTeamAnswerState()
  }

  createTeamAnswerState() {
    return {
      captain: null,
      partner: null,
    }
  }

  resetTeamAnswers() {
    this.teamAnswers = this.createTeamAnswerState()
    return this.teamAnswers
  }

  resetQuestionIndex() {
    this.questionIndex = 0
  }

  getNextQuestion() {
    const question = this.questionBank[this.questionIndex % this.questionBank.length]
    this.questionIndex += 1
    return question
  }

  openQuestion(question) {
    this.questionOpen = true
    this.activeQuestion = question
    this.resetTeamAnswers()
    this.questionTimeRemaining = this.questionTimeLimit
  }

  setTeamAnswer(role, answerIndex) {
    if (!this.questionOpen) {
      return false
    }

    this.teamAnswers[role] = answerIndex
    return true
  }

  getSelectedChoice(role) {
    const answerIndex = this.teamAnswers[role]

    if (answerIndex === null || !this.activeQuestion) {
      return null
    }

    return this.activeQuestion.options[answerIndex]
  }

  hasBothTeamAnswers() {
    return this.teamAnswers.captain !== null && this.teamAnswers.partner !== null
  }

  areTeamAnswersCorrect() {
    const correctAnswerIndex = this.activeQuestion?.correctAnswerIndex

    return (
      this.hasBothTeamAnswers() &&
      this.teamAnswers.captain === this.teamAnswers.partner &&
      this.teamAnswers.captain === correctAnswerIndex
    )
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
    this.resetTeamAnswers()
    this.questionTimeRemaining = this.questionTimeLimit
  }
}
