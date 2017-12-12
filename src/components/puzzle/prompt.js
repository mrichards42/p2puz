import Base from 'components/base'
import './prompt.scss'

const PROMPT_TEMPLATE = `
  <div class="clue-prompt">
    <span class="clue-number" />
    <span class="clue-text" />
  </div>
`

export class PromptView extends Base.View {
  constructor({template = PROMPT_TEMPLATE, ...opts} = {}) {
    super({template, ...opts})
    this.$number = this.$('.clue-number')
    this.$text = this.$('.clue-text')
  }

  renderClue(clue) {
    this.$number.html(clue.number + clue.orientation.slice(0, 1).toUpperCase())
    this.$text.html(clue.text)
  }
}

export default class PromptPresenter extends Base.Presenter {
  constructor({view = new PromptView(), ...opts} = {}) {
    super({view, ...opts})
    this.puzzle = null
  }

  setPuzzle(puzzle) {
    this.puzzle = puzzle
    this.puzzle.on('cursor', (square, orientation) => {
      this.view.renderClue(this.puzzle.currentClue)
    })
  }
}
