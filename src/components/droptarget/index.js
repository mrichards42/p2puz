import Base from 'components/base'
import { EventEmitterMixin } from 'util/event'
import './index.scss'

const TEMPLATE = `
  <div class="drop">
    <div class="drop-overlay" />
    <div class="drop-target">
      <div clas="drop-text">Drop a file!</div>
    </div>
  </div>
`

const BAD_EVENTS = 'dragenter dragover dragleave dragstart dragexit'

export class DropView extends EventEmitterMixin(Base.View, 'files') {
  constructor({template = TEMPLATE, ...opts} = {}) {
    super({template, ...opts})
    // Events on the drop target
    this.$('.drop-target')
      .on(BAD_EVENTS, e => this.killEvent(e.originalEvent))
      .on('drop', e => {
        this.killEvent(e.originalEvent)
        const files = this.getFilesFromEvent(e.originalEvent)
        this.emit('files', files)
        return false
      })
    // Events on the overlay (so we don't have to attach these to the body)
    this.$('.drop-overlay')
      .on('drop ' + BAD_EVENTS, e => this.killEvent(e.originalEvent))
      .on('dragend', e => this.cleanup(e.originalEvent))
  }

  killEvent(e) {
    e.preventDefault()
    e.stopPropagation()
    return false
  }

  // From https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop
  getFilesFromEvent(e) {
    this.killEvent(e)
    const dt = e.dataTransfer
    if (dt.items) {
      return ([].slice.call(dt.items)
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile()))
    } else {
      return dt.files
    }
  }

  cleanupFiles(e) {
    const dt = e.dataTransfer
    if (dt.items) {
      for (let i = 0; i < dt.items.length; i++) {
        dt.items.remove(i)
      }
    } else {
      dt.clearData()
    }
    return false
  }
}

export default
class DropPresenter extends EventEmitterMixin(Base.Presenter, 'file') {
  constructor({view = new DropView(), ...opts} = {}) {
    super({view, ...opts})
    this.view.on('files', files => {
      const reader = new FileReader()
      reader.onload = e => this.emit('file', e.target.result)
      reader.readAsArrayBuffer(files[0])
    })
  }
}
