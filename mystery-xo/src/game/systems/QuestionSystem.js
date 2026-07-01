export class QuestionSystem {
  // questionBank: flat fallback pool (union of the match's categories).
  // categoryBank: { [categoryId]: question[] } so a question can be drawn from
  //   the active answerer's OWN categories. Optional — falls back to questionBank.
  constructor({ questionBank, categoryBank = {}, questionTimeLimit }) {
    this.questionBank = questionBank
    this.categoryBank = categoryBank
    this.questionTimeLimit = questionTimeLimit
    // Per-source shuffle bags (draw without replacement; reshuffle when empty) so
    // questions are randomized AND non-repeating until a source cycles. Keyed by
    // category id, plus a special '*' bag over the flat fallback pool.
    this.bags = {}
    this.lastQuestionId = null
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

  // Retained as a no-op: question order is now randomized (shuffle bags), so a
  // per-stage index reset is meaningless. Kept so existing stage-reset callers
  // don't break.
  resetQuestionIndex() {}

  // Fisher–Yates over a shallow copy — a fresh shuffled queue for a bag.
  shuffle(list) {
    const out = [...list]
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  // Draw the next question from a shuffle bag identified by `key`, over `pool`.
  // Reshuffles when the bag empties; avoids repeating the immediately previous
  // question id when the pool is large enough to allow it.
  drawFromBag(key, pool) {
    if (!pool || pool.length === 0) return null
    let bag = this.bags[key]
    if (!bag || bag.length === 0) bag = this.bags[key] = this.shuffle(pool)
    let question = bag.pop()
    // Dodge an immediate back-to-back repeat when possible.
    if (question && question.id === this.lastQuestionId && bag.length > 0) {
      const swap = bag.pop()
      bag.push(question)
      question = swap
    }
    this.lastQuestionId = question?.id ?? null
    return question
  }

  // Pick a question tied to the acting answerer's categories:
  //   1. keep only ids that have questions in the category bank; pick ONE at random
  //      (so a player with several categories gets a random one each turn),
  //   2. fall back to the team's combined categories, then to the flat pool.
  getQuestionForCategories(categoryIds = [], fallbackIds = []) {
    const valid = this.validCategoryIds(categoryIds)
    if (valid.length) {
      const pick = valid[Math.floor(Math.random() * valid.length)]
      return this.drawFromBag(pick, this.categoryBank[pick])
    }
    const teamValid = this.validCategoryIds(fallbackIds)
    if (teamValid.length) {
      const pick = teamValid[Math.floor(Math.random() * teamValid.length)]
      return this.drawFromBag(pick, this.categoryBank[pick])
    }
    return this.getNextQuestion()
  }

  validCategoryIds(ids) {
    if (!Array.isArray(ids)) return []
    return [...new Set(ids)].filter((id) => this.categoryBank[id]?.length)
  }

  // Neutral random draw from the flat fallback pool. Used by the collision
  // contest, where both teams race one shared question (no single answerer).
  getNextQuestion() {
    return this.drawFromBag('*', this.questionBank)
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
