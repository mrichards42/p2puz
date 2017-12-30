import { EventEmitterMixin } from 'util/event'
import Base from 'components/base'
import './rebus.scss'

const REBUS_TEMPLATE = `
  <div class="rebus-entry">
    <form method="">
      <input type="text" />
    </form>
    <span class="rebus-hidden-text" />
  </div>
`

export class RebusView extends Base.View {
  constructor({template = REBUS_TEMPLATE, ...opts} = {}) {
    super({template, ...opts})
    this.$input = this.$('input')
    this.$('form').on('submit', e => this.submitForm())
    this.$input.on('blur', e => this.submitForm())
    this.$input.on('input', e => this.resizeInput())
    // This hidden text item controls the width of the rebus input
    this.$span = this.$('.rebus-hidden-text')
  }

  submitForm() {
    // Prevent double-submit
    if (this.isShown()) this.presenter.onFormSubmit(this.getText())
    return false
  }

  getText() {
    return this.$input.val().trim().toUpperCase()
  }

  renderSquare(square) {
    this.$input.val(square.letter)
    this.resizeInput()
  }

  resizeInput() {
    // Update max-width to be the body width
    const bodyWidth = document.body.clientWidth
    this.$el.css('max-width', bodyWidth)
    // Set hidden text, which will change the width
    this.$span.text(this.$input.val())
    // Attempt to center the div
    const parent = this.$el.parent()
    if (this.isShown() && parent.length) {
      const width = this.$el.outerWidth()
      let left = -(width - parent.outerWidth()) / 2
      // Constrain within the document window
      const parentLeft = parent.offset().left
      if (left + parentLeft < 0) {
        left = -parentLeft
      } else if (left + parentLeft + width > bodyWidth) {
        left = bodyWidth - width - parentLeft
      }
      this.$el.css('left', left)
    } else {
      // If this is not reset here, the next time we are show the div will
      // keep the old width
      this.$el.css('left', '')
    }
  }

  show() {
    super.show()
    this.$input.focus()
    this.resizeInput()
  }
}

export default
class RebusPresenter extends EventEmitterMixin(Base.Presenter, 'submit') {
  constructor({view = new RebusView(), ...opts} = {}) {
    super({view, ...opts})
    this.puzzle = null
  }

  onFormSubmit(letter) {
    this.emit('submit', letter)
  }

  getText() {
    return this.view.getText()
  }

  setSquare(square) {
    this.view.renderSquare(square)
  }
}
