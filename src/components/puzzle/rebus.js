import { EventEmitterMixin } from 'util/event'
import Base from 'components/base'
import './rebus.scss'

const REBUS_TEMPLATE = `
  <div class="rebus-entry">
    <form method="">
      <input type="text" />
    </form>
  </div>
`

export class RebusView extends Base.View {
  constructor({template = REBUS_TEMPLATE, ...opts} = {}) {
    super({template, ...opts})
    this.$input = this.$('input')
    this.$('form').on('submit', e => this.submitForm())
    this.$input.on('blur', e => this.submitForm())
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
  }

  show() {
    super.show()
    this.$input.focus()
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
