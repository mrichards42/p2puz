import _ from 'lodash'
import { EventEmitterMixin } from 'util/event'
import Puzzle from 'models/puzzle'
import Base from 'components/base'
import PuzzlePresenter from 'components/puzzle'
import Toolbar from 'components/toolbar'
import Chat from 'components/chat'
import PuzzlePeer from './peer'
import { makeTool } from './tools'
import './index.scss'

const TEMPLATE = `
  <div class="puzzle-app">
    <div class="puzzle-layout" />
  </div>
`

export class AppView extends Base.View {
  constructor({template = TEMPLATE, ...opts} = {}) {
    super({template, ...opts})
    this.$layout = this.$('.puzzle-layout')
    this.sidebar = {}
  }

  addToolbar(view) {
    this.$el.prepend(view.$el)
  }

  addPuzzle(view) {
    this.$layout.append(view.$el)
  }

  addSidebar(view, side = 'right') {
    if (side === 'right') {
      this.$layout.append(view.$el)
    } else {
      this.$layout.prepend(view.$el)
    }
  }
}

// Presenter config

const DEFAULT_CONFIG = app => ({
  responsive: true,
  prompt: true,
  clues: 'vertical',
  orientation: 'landscape',
  toolbar: ['title', 'open', 'check', 'rebus', 'downs_only', 'p2p'],
})

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
      this.toolbar = new Toolbar(),
      this.puzzlePresenter = new PuzzlePresenter(),
      this.chat = new Chat().hide(),
    ]
    this.view.addToolbar(this.toolbar)
    this.view.addPuzzle(this.puzzlePresenter)
    this.view.addSidebar(this.chat, 'right')
    this.chat.on('link', (...args) => this.handleChatLink(...args))
    // Handle grid events
    this.forwardEvents(this.puzzlePresenter.grid, 'rebus-show', 'rebus-hide')
    // Set initial config
    this._config = {}
    this.configure(_.assign({}, DEFAULT_CONFIG(this), opts))
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
   * @param {(object|function|string)[]} tools - array of tool definitions
   * @param {string} tools[].label - menu label
   * @param {string} [tools[].html] - item html override (default: label)
   * @param {object} [tools[].events] - event mapping
   * @param {array} [tools[].items] - sub items
   *
   * @example
   * app.setTools([
   *   {...},            // full tool definition
   *   (app) => ({...}), // function taking app and returning a definition
   *   'title',          // tool defined in app/tools.js
   * ])
   */
  setTools(tools) {
    this.toolbar.setTools(tools.map(t => makeTool(this, this.toolbar, t)))
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
    peer.on('connect', () => this.toggleSidebar(this.chat, true))
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

  // Chat Links
  handleChatLink(number, orientation) {
    if (this.puzzle && this.puzzle.clues[orientation]) {
      for (const clue of this.puzzle.clues[orientation]) {
        // Data types could be different here
        if (clue.number == number) { // eslint-disable-line eqeqeq
          this.puzzle.moveCursor(clue.square, orientation)
          return
        }
      }
    }
  }

  // Toolbar handlers
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
