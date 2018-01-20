import Base from 'components/base'
import { EventEmitterMixin } from 'util/event'
import './index.scss'

let id = 1
const TEMPLATE = `
  <div class="file-input">
    <form class="file-form" id="file-upload">
      <label for="file-upload" />
      <input name="file" type="file" />
    </form>
  </div>
`

export class FileView extends EventEmitterMixin(Base.View, 'file') {
  constructor({
    template = TEMPLATE,
    label = 'Open',
    accept = '',
    ...opts
  } = {}) {
    super({template, ...opts})
    this.$input = this.$('input')
    this.$input.attr('id', 'file-input-' + id)
    this.$input.change(e => this.presenter.onFile(this.getFile()))
    if (accept) this.$input.attr('accept', accept)
    this.$label = this.$('label')
    this.$label.text(label).attr('for', 'file-input-' + id)
    // Handle clicks on the parent div
    this.$el.click(e => {
      if (e.target === this.$el[0]) this.$input.click()
    })
    ++id
  }

  getFile() {
    return this.$input[0].files[0]
  }
}

export default
class FilePresenter extends EventEmitterMixin(Base.Presenter, 'file') {
  constructor({
    label = 'Open',
    accept = '',
    view = new FileView({label, accept}),
    ...opts
  } = {}) {
    super({view, ...opts})
  }

  onFile(file) {
    const reader = new FileReader()
    reader.onload = e => this.emit('file', file.name, e.target.result)
    reader.readAsArrayBuffer(file)
  }
}
