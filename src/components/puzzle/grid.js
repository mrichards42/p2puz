import _ from 'lodash'
import $ from 'jquery'
import Mousetrap from 'mousetrap'
import settings from './settings'
import Base from 'components/base'
import { EventEmitterMixin } from 'util/event'
import Rebus from './rebus'
import './grid.scss'

const VALID_KEYS =
'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
'1234567890' +
'!@#$%^&*()_+=-[]{}\\|/?><,`~\'"'

const TEMPLATE = '<div class="puzzle-grid"><table /></div>'

export class GridView extends Base.View {
  constructor({template = TEMPLATE, ...opts} = {}) {
    super({template, ...opts})
    this.$table = this.$('table')
    this.$squares = null
    this.rows = 0
    this.cols = 0
    this.aspectRatio = 1
    // Single click event on the entire grid so that mobile browsers don't have
    // to deal with a click target for each square.  These would be so small
    // that the link zooming feature would always be triggered.
    this.$el.click(e => {
      const $target = $(e.target)
      let $square = $target.find('.square')
      if (!$square.length) $square = $target.closest('.square')
      const idx = $square.data('idx')
      if (idx != null) {
        return this.presenter.onSquareClick(idx)
      } else {
        return false
      }
    })
  }

  createGrid(rows, cols) {
    this.$table.empty()
    this.rows = rows
    this.cols = cols
    this.aspectRatio = cols / rows
    this.$table.append(`
      ${_.range(rows).map(row => `
        <tr> ${_.range(cols).map(col => `
          <td>
            <div class="square" data-idx=${row * rows + col}>
              <div class="solution text" />
              <div class="user text" />
              <div class="number" />
              <div class="decoration" />
            </div>
          </td> `).join('')}
        </tr> `).join('')}
    `)
    this.$squares = this.$el.find('.square')
    this.resizeGrid()
  }

  renderSquare(square) {
    const $div = this.$squares.eq(square.idx)
    $div.parent().toggleClass('blacksquare', square.isBlack)
    $div.children('.number').text(square.number || '').show(square.number > 0)
    $div.children('.solution').text(square.solution)
    $div.children('.user').text(square.letter)
    $div.toggleClass('correct', square.isCorrect)
    // decorations
    if (square.shapebg) {
      $div.children('.decoration')
        .addClass('decoration-' + square.shapebg).show()
    } else {
      $div.children('.decoration').hide()
    }
  }

  renderRemoteLetter(i, letter) {
    const $div = this.$squares.eq(i)
    let $remote = $div.children('.remote')
    if (!$remote.length) $remote = $('<div class="text remote">').appendTo($div)
    $remote.text(letter || '')
  }

  renderCursor(square, cssClass = 'cursor-highlight') {
    this.$('.' + cssClass).removeClass(cssClass)
    this.$squares.eq(square.idx).parent().addClass(cssClass)
  }

  renderWordHighlight(squares, cssClass = 'word-highlight') {
    this.$('.' + cssClass).removeClass(cssClass)
    for (const square of squares) {
      this.$squares.eq(square.idx).parent().addClass(cssClass)
    }
  }

  setRebusSquare(rebusView, square) {
    rebusView.$el.detach()
    this.$squares.eq(square.idx).append(rebusView.$el)
  }

  /**
   * Resizes the grid to fit within the parent boundaries.
   * This should be called after the parent element changes size.
   */
  resizeGrid() {
    if (!this.rows || !this.cols) return
    const $table = this.$table
    const $parent = this.$el.parent()
    const cellBorder = 1
    const parentWidth = $parent.width()
    const parentHeight = $parent.height()
    const width = parentWidth - cellBorder * (this.cols + 1)
    const height = parentHeight - cellBorder * (this.rows + 1)
    if (this._lastWidth === width && this.lastHeight === height) return
    // Constrain using width or height depending on the grid aspect ratio
    const parentAspectRatio = width / height
    if (parentAspectRatio > this.aspectRatio) {
      this._scale = height / ($table.height() / (this._scale || 1))
    } else {
      this._scale = width / ($table.width() / (this._scale || 1))
    }
    // Avoid small meaningless changes
    this._scale = +this._scale.toFixed(4)
    // Handle very small grids
    if (this._scale < 0 || isNaN(this._scale)) this._scale = 0.1
    // Resize
    $table.css({fontSize: this._scale + 'em'})
    // Center -- calculate in js to work around a chrome bug where css
    // transforms cause blurry border
    $table.css({
      left: Math.max(0, Math.floor((parentWidth - $table.width()) / 2)),
      top: Math.max(0, Math.floor((parentHeight - $table.height()) / 2)),
    })
    this._lastWidth = width
    this._lastHeight = height
  }

  /**
   * Returns the current grid scale.
   */
  getScale() {
    return this._scale || 1
  }
}

const GRID_BASE = EventEmitterMixin(Base.Presenter, 'rebus-show', 'rebus-hide')
/**
 * Grid presenter
 */
export default class GridPresenter extends GRID_BASE {
  constructor({view = new GridView(), config = {}, ...opts} = {}) {
    super({view, ...opts})
    this.puzzle = null
    this.bindEvents()
  }

  setPuzzle(puzzle) {
    this.puzzle = puzzle
    this._remoteState = null
    // Create the rest of the view
    this.view.createGrid(puzzle.rows, puzzle.cols)
    for (const square of puzzle.squares) {
      this.view.renderSquare(square)
    }
    // Register puzzle events
    this.puzzle.on('letter', square => this.view.renderSquare(square))
    this.puzzle.on('cursor', (square, orientation) => {
      this.view.renderCursor(square)
      const wordSquares = this.puzzle.findSquaresInWord(square, orientation)
      this.view.renderWordHighlight(wordSquares)
      // Cursor movement counts as rebus dismissal
      this.toggleRebus(false)
    })
  }

  onSquareClick(idx) {
    const square = this.puzzle.squares[idx]
    if (square.idx === this.puzzle.currentSquare.idx) {
      this.swapOrientation()
    } else {
      this.moveCursor(square)
    }
    return false
  }

  bindEvents() {
    // Mouse events
    this.$el.contextmenu(e => this.swapOrientation())
    // Keyboard events
    const mt = new Mousetrap()
    mt.bind('right', () => this.moveOne('across', 'next'))
    mt.bind('left',  () => this.moveOne('across', 'prev'))
    mt.bind('down',  () => this.moveOne('down', 'next'))
    mt.bind('up',    () => this.moveOne('down', 'prev'))
    mt.bind('shift+right', () => this.slideOne('across', 'next'))
    mt.bind('shift+left',  () => this.slideOne('across', 'prev'))
    mt.bind('shift+down',  () => this.slideOne('down', 'next'))
    mt.bind('shift+up',    () => this.slideOne('down', 'prev'))
    mt.bind('tab',         () => this.moveOneClue('next'))
    mt.bind('shift+tab',   () => this.moveOneClue('prev'))
    mt.bind('home', () => this.moveCursor(this.puzzle.findWordStart('current')))
    mt.bind('end',  () => this.moveCursor(this.puzzle.findWordEnd('current')))
    mt.bind('ins',  () => this.toggleRebus())

    // Letter entry
    const keys = VALID_KEYS.split('').concat(VALID_KEYS.toLowerCase().split(''))
    mt.bind(keys, (e, letter) => this.enterLetter(letter.toUpperCase(), 'next'))
    mt.bind('del', () => this.enterLetter(''))
    mt.bind('backspace', () => this.enterLetter('', 'prev'))
    mt.bind('space', () => {
      switch (settings['grid.keys.space']) {
        case 'orientation':
          return this.swapOrientation()
        case 'erase':
        default:
          return this.enterLetter('', 'next')
      }
    })
  }

  /** Toggle the rebus entry */
  toggleRebus(state) {
    if (state == null) state = !(this._rebus && this._rebus.isShown())
    if (!state && !this._rebus) return // can short-circuit this case
    let rebus = this._rebus
    if (!rebus) {
      // Create the rebus presenter
      rebus = this._rebus = new Rebus()
      rebus.on('submit', letter => {
        this.enterLetter(letter, 'next')
        this.toggleRebus(false)
      })
    }
    if (state) {
      // Set the current square and show
      const square = this.puzzle.currentSquare
      rebus.setSquare(square)
      this.view.setRebusSquare(rebus.view, square)
      rebus.show()
      this.emit('rebus-show', square)
    } else {
      rebus.hide()
      this.emit('rebus-hide', this.puzzle.currentSquare)
    }
  }

  // Cursor movement functions
  moveCursor(square, orientation) {
    if (typeof square === 'number') {
      square = this.puzzle.squares[square]
    }
    if (square && square.isWhite) {
      this.puzzle.moveCursor(square, orientation)
    }
    return false
  }

  moveClue(square, orientation = this.puzzle.currentOrientation) {
    // Check first blank on new clue
    let newSquare
    switch (settings['grid.movement.newClue']) {
      case 'start':
        // Start of word
        newSquare = this.puzzle.findWordStart(square, orientation)
        break
      case 'blank':
        // First blank square
        newSquare = this.findBlank(
          this.puzzle.findWordStart(square, orientation), orientation)
        break
      case null:
      default:
        newSquare = square
    }
    return this.moveCursor(newSquare || square, orientation)
  }

  swapOrientation() {
    this.moveCursor(this.puzzle.currentSquare, this.puzzle.oppositeOrientation)
    return false
  }

  /**
   * Enter a letter and optionally move to the next square
   *
   * @param {string} letter - letter to set
   * @param {string} moveDirection - direction to move ('prev'|'next'|null)
   */
  enterLetter(letter, moveDirection = null) {
    let square = this.puzzle.currentSquare
    square.letter = letter
    if (moveDirection) {
      // Next square
      square = square[moveDirection][this.puzzle.currentOrientation]
      if (letter && settings['grid.movement.afterLetter'] === 'blank') {
        square = this.findBlank(square) || square
      }
      if (square && !square.isBlack) {
        this.moveCursor(square)
      }
    }
    return false
  }

  // Single key movement function
  moveOne(orientation, direction) {
    const onlyOrientation =
      orientation !== this.puzzle.currentOrientation &&
      this.puzzle.currentSquare.isEmpty &&
      settings['grid.movement.pauseBeforeSwitch']

    if (onlyOrientation) {
      this.moveCursor(this.puzzle.currentSquare, orientation)
      return false
    }
    // Find the next white square
    const square = this.puzzle.findSquare({
      from: 'current',
      orientation: orientation,
      direction: direction,
      test: s => s !== this.puzzle.currentSquare && s.isWhite,
    })
    this.moveCursor(square, orientation)
    return false
  }

  // Shift + key movement
  slideOne(orientation, direction) {
    if (orientation === this.puzzle.currentOrientation) {
      // Start of the next word
      // TODO: this is broken
      let square = this.puzzle.findWordStart('current', orientation)
      square = this.puzzle.findSquare({
        from: square,
        orientation: orientation,
        direction: direction + 'Wrap',
        test: s => s !== square && s.isStart(orientation),
      })
      this.moveClue(square)
    } else {
      // Find the next white square
      const square = this.puzzle.findSquare({
        from: 'current',
        orientation: orientation,
        direction: direction,
        test: s => s !== this.puzzle.currentSquare && s.isWhite,
      })
      this.moveClue(square)
    }
    return false
  }

  // Tab movement
  moveOneClue(direction) {
    let orientation = this.puzzle.currentOrientation
    const idx = this.puzzle.currentClue.idx
    let clue
    if (direction === 'next') {
      // Next clue
      clue = this.puzzle.clues[orientation][idx + 1]
      if (!clue) {
        // First clue in the opposite direction
        orientation = orientation === 'across' ? 'down' : 'across'
        clue = this.puzzle.clues[orientation][0]
      }
    } else {
      // Prev clue
      clue = this.puzzle.clues[orientation][idx - 1]
      if (!clue) {
        // Last clue in the opposite direction
        orientation = orientation === 'across' ? 'down' : 'across'
        clue = this.puzzle.clues[orientation].slice(-1)[0]
      }
    }
    this.moveClue(clue.square, orientation)
    return false
  }

  // Utility
  findBlank(square, orientation = this.puzzle.currentOrientation) {
    return this.puzzle.findSquare({
      from: square,
      orientation: orientation,
      inWord: true,
      test: s => s.isEmpty,
    })
  }

  // Remote
  setRemoteState(state) {
    // Cursor highlight
    {
      const square = this.puzzle.squares[state.cursor]
      const orientation = state.orientation
      this.view.renderCursor(square, 'remote-cursor-highlight')
      const wordSquares = this.puzzle.findSquaresInWord(square, orientation)
      this.view.renderWordHighlight(wordSquares, 'remote-word-highlight')
    }
    // Letters
    let letterCallback
    if (settings['remote.letter.overwrite']) {
      // Update the grid and re-render changed squares
      letterCallback = (letter, i) => {
        this.puzzle.state.grid[i] = letter
        this.view.renderSquare(this.puzzle.squares[i])
      }
    } else {
      // Re-render the remote grid
      letterCallback = (letter, i) => {
        this.view.renderRemoteLetter(i, letter)
      }
    }
    // Compute grid diffs and run the callback
    if (!this._remoteState) {
      state.grid.forEach(letterCallback)
    } else {
      state.grid.forEach((letter, i) => {
        if (this._remoteState.grid[i] !== letter) letterCallback(letter, i)
      })
    }
    this._remoteState = state
  }
}
