import _ from 'lodash'
import strftime from 'util/strftime'
import { EventEmitterMixin } from 'util/event'
import Puzzle from 'models/puzzle'
import Base from 'components/base'
import PuzzlePresenter from 'components/puzzle'
import Toolbar from 'components/toolbar'
import './index.scss'

const TEMPLATE = '<div class="puzzle-app"></div>'

export class AppView extends Base.View {
  constructor({template = TEMPLATE, ...opts} = {}) {
    super({template, ...opts})
  }
}

// Presenter config

const TITLE_FORMAT = ({title, date, author, editor, copyright}) => {
  // Normalize title
  if (!title && date) title = strftime(date, '<b>DDDD</b>, MMMM D, YYYY')
  // Normalize author and editor
  if (!editor) [, author, editor] = author.match(/(.*)\/(.*)/) || ['', author]
  if (author) author = 'By ' + author.replace(/^\s*by\s+/i, '')
  if (editor) editor = 'Edited by ' + editor.replace(/^\s*\w*\s*by\s+/i, '')
  author = author && editor ? author + ' \u25AA ' + editor : author || editor
  // Normalize copyright
  if (copyright && !/\u00A9/.test(copyright)) {
    copyright = '\u00A9 ' + copyright.replace(/^\s*\(c\)\s*/i, '')
  }
  // Template
  return `
    <span class="meta-title">${title || ''}</span>
    <span class="meta-author">${author || ''}</span>
    <span class="meta-copyright">${copyright || ''}</span>
  `
}

const DEFAULT_CONFIG = {
  responsive: true,
  prompt: true,
  clues: 'vertical',
  orientation: 'landscape',
  toolbar: [
    {html: TITLE_FORMAT, class: 'toolbar-puzzle-title'},
  ],
}

/**
 * Main app class.
 */
class AppPresenter extends EventEmitterMixin(Base.Presenter, 'puzzle') {
  /**
   * Constructs a new AppPresenter.
   * @param {object} opts - options passed to {@link AppPresenter#configure}
   * @param {View} [opts.view={@link AppView}]
   * @param {(Node|jQuery|selector)} [opts.el] - element to attach the view to
   */
  constructor({el, view = new AppView(), ...opts} = {}) {
    super({view, el, ...opts})
    this.puzzle = null
    this.components = [
      this.toolbar = new Toolbar().appendTo(this),
      this.puzzlePresenter = new PuzzlePresenter().appendTo(this),
    ]
    // Set initial config
    this._config = {}
    this.configure(_.assign({}, DEFAULT_CONFIG, opts))
  }

  /**
   * Sets the puzzle.
   * @param {Puzzle} puzzle
   * @fires AppPresenter.puzzle
   */
  setPuzzle(puzzle) {
    // Don't set the same puzzle twice
    if (puzzle === this.puzzle) return
    this.puzzle = puzzle
    if (this.peer) this.peer.setPuzzle(puzzle)
    this._componentCall('setPuzzle', puzzle)
    this.emit('puzzle', puzzle)
  }

  /**
   * Loads a puzzle from data or a url.
   * @param {object} opts
   * @param {string} opts.type - puzzle format
   * @param {string} [opts.url] - puzzle url
   * @param {*} [opts.data] - puzzle data (specific to format)
   * @returns {Promise}
   */
  loadPuzzle({type, url, data}) {
    if (url) {
      return Puzzle.fetch(type, url).then(p => { this.setPuzzle(p); return p })
    } else {
      return new Promise((resolve, reject) => {
        const p = Puzzle.load(type, data)
        this.setPuzzle(p)
        resolve(p)
      })
    }
  }

  /**
   * Sets configuration options.
   * @param {object} opts - key/value pairs to set
   * @param {boolean} [opts.responsive] - turn on/off responsive layout
   * @param {boolean} [opts.prompt] - show/hide the prompt
   * @param {string} [opts.clues] - clues layout
   * @param {string} [opts.orientation] - overall layout orientation
   * @param {object} [opts.toolbar] - toolbar config
   */
  configure({toolbar, ...opts}) {
    // We handle the toolbar
    if (toolbar) this.setTools(toolbar)
    // Puzzle presenter handls the rest
    this.puzzlePresenter.configure(opts)
  }

  /**
   * Sets the toolbar config
   * @param {object[]} tools - array of tool definitions
   * @param {string} tools[].label - menu label
   * @param {string} [tools[].html] - item html override (default: label)
   * @param {object} [tools[].events] - event mapping
   * @param {array} [tools[].items] - sub items
   */
  setTools(tools) {
    this.toolbar.setTools(tools)
  }

  /**
   * Add an item to the toolbar
   * @param {object} tool definition
   * @see PuzzleToolbar#addTool
   */
  addTool(tool) {
    this.toolbar.addTool(tool)
  }

  // Remote events
  setPeerManager(manager) {
    if (!this.peer) this.setPeer(new PuzzlePeer(manager))
    this._componentCall('setPeerManager', manager)
  }

  setPeer(peer) {
    this.peer = peer
    // Puzzle events
    peer.on('puzzle', puzzle => {
      if (puzzle) this.setPuzzle(puzzle)
    })
    peer.on('puzzle-state', state => {
      if (this.puzzle) this.puzzlePresenter.setRemoteState(state)
    })
    if (this.puzzle) peer.setPuzzle(this.puzzle)
  }

  getPeer() {
    return this.peer
  }

  toggleSidebar(view, state) {
    view.toggle(state)
    this.puzzlePresenter.layout()
  }

  show() {
    super.show()
    this.puzzlePresenter.layout()
    return this
  }

  _componentCall(func, ...args) {
    for (const c of this.components) {
      if (c[func]) c[func](...args)
    }
  }

}

/**
 * Fired after the puzzle is changed.
 * @event AppPresenter.puzzle
 */

export default AppPresenter
