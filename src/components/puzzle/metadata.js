import Base from 'components/base'
import './metadata.scss'

const META_TEMPLATE = `<div></div>`

export class MetadataView extends Base.View {
  constructor({template = META_TEMPLATE, ...opts} = {}) {
    super({template, ...opts})
  }

  setHtml(html) {
    this.$el.html(html)
    this.$el.show(/\S/.test(this.$el.text()))
  }
}

export default class MetadataPresenter extends Base.Presenter {
  constructor({
    view = new MetadataView(),
    format,
    class: cssClass = 'metadata',
    ...opts} = {}
  ) {
    super({view, ...opts})
    this.puzzle = null
    this.format = format
    if (cssClass) this.$el.addClass(cssClass)
  }

  setFormat(format) {
    this.formatter = format
    this._updateText()
  }

  setPuzzle(puzzle) {
    this.puzzle = puzzle
    this._update()
  }

  _update() {
    if (this.puzzle && this.format) {
      this.view.setHtml('' + this.format(this.puzzle.meta, this.puzzle))
    } else {
      this.view.setHtml('')
    }
  }
}
