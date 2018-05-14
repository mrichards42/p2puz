import EventEmitter from 'util/event'

// File types
const FORMATS = {}
;['puz', 'json'].forEach(type => {
  FORMATS[type] = require('./format/' + type).default
})

/**
 * The crossword puzzle model.
 * @property {number} rows - rows in the grid
 * @property {number} cols - cols in the grid
 * @property {number} size - total number of squares in the grid
 * @property {Square[]} squares - the grid
 * @property {object} clues - clues
 * @property {Clue[]} clues.across - across clues
 * @property {Clue[]} clues.down - down clues
 * @property {object} meta - puzzle metadata
 * @property {string} meta.title - puzzle title
 * @property {string} meta.author - puzzle author
 * @property {string} meta.copyright - puzzle copyright
 * @property {PuzzleState} state - current puzzle state
 */
class Puzzle extends EventEmitter {
  constructor(rows, cols) {
    super('cursor', 'letter')
    this.rows = rows
    this.cols = cols
    this.size = rows * cols
    this.squares = []
    this.clues = {}
    this.meta = {
      title: '',
      author: '',
      copyright: '',
    }
    this.state = new PuzzleState(this)
    this._initGrid()
  }

  _init() {
    this._matchCluesAndGrid()
    // Find the first white square and move to it
    if (this.currentSquare == null || this.currentOrientation == null) {
      const orientation = this.currentOrientation || 'across'
      const square = this.findSquare({
        from: this.currentSquare || this.squares[0],
        orientation: orientation,
        test: s => s.isWhite,
      })
      this.moveCursor(square, orientation)
    }
    return this
  }

  // Construction
  addClue(number, orientation, text) {
    if (!this.clues[orientation]) this.clues[orientation] = []
    this.clues[orientation].push(
      new Clue(this, this.clues[orientation].length, number, orientation, text))
  }

  /**
   * Reads puzzle data
   * @param {string} type - puzzle format (see puzzle/formats)
   * @param {*} data - data required by the format
   * @returns {Puzzle}
   */
  static load(type, data) {
    const puzzle = FORMATS[type].load(data)
    if (puzzle) return puzzle._init()
  }

  /**
   * Fetches and loads a puzzle from a url.
   * @param {string} type - puzzle format (see puzzle/formats)
   * @param {string} url - puzzle url
   * @returns {Puzzle}
   */
  static fetch(type, url) {
    return Promise.resolve(FORMATS[type].fetch(url)).then(
      data => Puzzle.load(type, data)
    )
  }

  /**
   * Saves puzzle data
   * @param {string} type - puzzle format (see puzzle/formats)
   * @returns {*} puzzle data
   */
  save(type) {
    return FORMATS[type].save(this)
  }

  /* State */

  /** @type {Square} */
  get currentSquare() {
    return this.squares[this.state.cursor]
  }

  /** @type {string} */
  get currentOrientation() {
    return this.state.orientation
  }

  /** @type {string} */
  get oppositeOrientation() {
    return this.state.orientation === 'across' ? 'down' : 'across'
  }

  /** @type {Clue} */
  get currentClue() {
    return this.currentSquare.clues[this.currentOrientation]
  }

  /** @type {Clue} */
  get oppositeClue() {
    return this.currentSquare.clues[this.oppositeOrientation]
  }

  /**
   * Move the cursor to the given word.
   * @param {Square} square - square to select
   * @param {('across'|'down')} orientation - word orientation
   * @fires Puzzle.cursor
   */
  moveCursor(square, orientation = this.currentOrientation) {
    if (!square) return
    this.state.cursor = square.idx
    this.state.orientation = orientation
    this.emit('cursor', this.currentSquare, this.currentOrientation)
  }

  /* Grid */

  get lastCol() {
    return this.cols - 1
  }

  get lastRow() {
    return this.row - 1
  }

  getSquare(row, col) {
    // Check bounds
    if (row < 0 || col < 0 || row > this.lastRow || col > this.lastCol) return
    return this.squares[this.cols * row + col]
  }

  /**
   * Find a square.
   * @param {object} opts
   * @param {function} opts.test - callback function taking a square
   * @param {(Square|'current')} opts.from - square to start the search from
   * @param {string} [opts.orientation='current'] - orientation to search
   * @param {string} [opts.direction='next'] - direction to search
   * @param {boolean} [opts.inWord=false] - search only within the word
   * @param {boolean} [opts.iterate=false]
   *
   * @example
   * // First empty square in the word
   * const square = puzzle.findSquare({
   *   test: s => s.isWhite() && s.isEmpty(),
   *   from: 'current',
   *   orientation: 'across',
   *   inWord: true,
   * })
   */
  findSquare({
    test,
    from,
    orientation = this.currentOrientation,
    direction = 'next',
    inWord = false,
    iterate = false,
  }) {
    // Current
    if (from === 'current') from = this.currentSquare
    // Find
    let square = from
    do {
      if (!square) {
        return
      } else if (inWord && !square.isSameWord(from, orientation)) {
        return
      } else if (test(square, orientation, direction)) {
        if (!iterate) return square
      }
      square = square[direction][orientation]
    } while (square !== from)
  }

  forEachSquare(opts, callback) {
    opts.from = opts.from || this.squares[0]
    opts.direction = (opts.direction || 'next') + 'Wrap'
    opts.iterate = true
    opts.test = opts.test || callback
    this.findSquare(opts)
  }

  findWordStart(square, orientation = this.currentOrientation) {
    if (square === 'current') square = this.currentSquare
    if (!square) return
    return square.clues[orientation].square
  }

  findWordEnd(square, orientation = this.currentOrientation) {
    return this.findSquare({
      from: square,
      orientation: orientation,
      test: s => s.isEnd(orientation),
    })
  }

  findSquaresInWord(square, orientation = this.currentOrientation) {
    const wordSquares = []
    this.forEachSquare({
      from: this.findWordStart(square, orientation),
      orientation: orientation,
      inWord: true,
      test: s => wordSquares.push(s),
    })
    return wordSquares
  }

  _initGrid() {
    for (let row = 0; row < this.rows; ++row) {
      for (let col = 0; col < this.cols; ++col) {
        const idx = this.cols * row + col
        this.squares.push(new Square(this, row, col, idx, '', 0))
      }
    }
    // Fill in traversal info
    for (const s of this.squares) {
      s.prev = {
        across: this.getSquare(s.row, s.col - 1),
        down:   this.getSquare(s.row - 1, s.col),
      }
      s.next = {
        across: this.getSquare(s.row, s.col + 1),
        down:   this.getSquare(s.row + 1, s.col),
      }
      s.prevWrap = {
        across: s.prev.across || this.getSquare(s.row - 1, this.lastCol),
        down:   s.prev.down   || this.getSquare(this.lastRow, s.col - 1),
      }
      s.nextWrap = {
        across: s.next.across || this.getSquare(s.row + 1, 0),
        down:   s.next.down   || this.getSquare(0, s.col + 1),
      }
    }
  }

  _matchCluesAndGrid() {
    // Map number/orientation to clue
    const cluesByNumber = {}
    for (const orientation in this.clues) {
      cluesByNumber[orientation] = {}
      for (const clue of this.clues[orientation]) {
        cluesByNumber[orientation][clue.number] = clue
      }
    }
    // Run through across and down clues and match clues to squares
    let clue = null
    ;['across', 'down'].forEach(orientation => {
      this.forEachSquare({orientation: orientation}, s => {
        const currentClue = cluesByNumber[orientation][s.number]
        if (!clue || (s.number !== clue.number && currentClue)) {
          clue = currentClue
          if (clue) clue.square = s
        }
        s.clues[orientation] = s.isWhite ? clue : null
      })
    })
  }
}

/**
 * Cursor moved event.
 * @event Puzzle.cursor
 * @param {Square} square
 * @param {string} orientation
 */

/**
 * Letter changed event.
 * @event Puzzle.letter
 * @param {Square} square
 * @param {string} letter
 */

export default Puzzle

/**
 * A square in the grid.
 * @property {Puzzle} puzzle - the puzzle this square belongs to
 * @property {number} row - row in the grid
 * @property {number} col - col in the grid
 * @property {number} idx - overall index in the grid
 * @property {string} solution - solution text
 * @property {string} number - grid number
 * @property {string} shapebg - background shape
 * @property {{across:Clue, down:Clue}} clues - clues
 * @property {Clue} clues.across - across clue
 * @property {Clue} clues.down - down clue
 */
class Square {
  constructor(puzzle, row, col, idx, solution, number) {
    this.puzzle = puzzle
    this.row = row
    this.col = col
    this.idx = idx
    this.solution = solution
    this.number = number
    this.prev = null
    this.next = null
    this.prevWrap = null
    this.nextWrap = null
    this.shapebg = null
    this.clues = {}
  }

  /**
   * User text.
   * @type {string}
   * @fires Puzzle.letter
   */
  get letter() {
    return this.puzzle.state.grid[this.idx] || ''
  }

  set letter(letter) {
    this.puzzle.state.grid[this.idx] = letter
    this.puzzle.emit('letter', this, letter)
  }

  get isBlack() {
    return this.solution === '.'
  }

  get isWhite() {
    return !this.isBlack
  }

  get isEmpty() {
    return !this.isBlack && this.letter === ''
  }

  get isCorrect() {
    return this.solution === this.letter
  }

  isStart(direction) {
    return !this.isBlack &&
      (!this.prev[direction] || this.prev[direction].isBlack)
  }

  isEnd(direction) {
    return !this.isBlack &&
        (!this.next[direction] || this.next[direction].isBlack)
  }

  isSameWord(otherSquare, orientation) {
    return this.clues[orientation] === otherSquare.clues[orientation]
  }
}

/**
 * A clue.
 * @property {string} number - clue number
 * @property {string} text - clue text
 * @property {string} orientation - 'across' or 'down'
 * @property {number} idx - index in the clue list
 * @property {Square} square - starting square for this clue
 */
class Clue {
  constructor(puzzle, idx, number, orientation, text) {
    this.idx = idx
    this.number = number
    this.orientation = orientation
    this.text = text
    this.square = null
  }
}

/**
 * Puzzle solving state.
 * @property {number} cursor - highlighted {@link Square} index
 * @property {string} orientation - 'across' or 'down'
 * @property {string[]} grid - current grid as solved by the user
 */
class PuzzleState {
  constructor(puzzle) {
    this.cursor = null
    this.orientation = null
    this.grid = puzzle.squares.map(x => '')
  }
}
