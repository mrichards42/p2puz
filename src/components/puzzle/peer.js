import _ from 'lodash'
import Peer from 'util/peer'
import Puzzle from 'models/puzzle'

const DATA_TYPES = {
  /**
   * Puzzle requested event.
   * @event PuzzlePeer.request-puzzle
   */
  'request-puzzle': null,
  /**
   * Puzzle recieved event.
   * @event PuzzlePeer.puzzle
   * @param {Puzzle} puzzle
   */
  'puzzle': {
    default: self => self.puzzle,
    send: puzzle => puzzle ? puzzle.save('json') : null,
    receive: data => data ? Puzzle.load('json', data) : null,
  },
  /**
   * Puzzle state updated event.
   * @event PuzzlePeer.puzzle-state
   * @param {PuzzleState} state - the new state
   */
  'puzzle-state': {
    default: self => self.puzzle,
    send: puzzle => puzzle ? puzzle.state : null,
  },
}

/**
 * A WebRTC peer used for syncing {@link Puzzle} state
 */
class PuzzlePeer extends Peer {
  constructor(manager, dataTypes = DATA_TYPES) {
    super(manager, dataTypes)
    this.puzzle = null
    // Request the initial puzzle
    this.on('connect', () => {
      if (!this.puzzle) this.send('request-puzzle')
    })
    // Handle incoming requests
    this.on('request-puzzle', () => {
      if (this.puzzle) {
        this.send('puzzle')
        this.send('puzzle-state')
      } else {
        this._puzzleRequested = true
      }
    })
  }

  /**
   * Sets the puzzle and registers puzzle listeners.
   * @param {Puzzle} puzzle
   */
  setPuzzle(puzzle) {
    if (puzzle === this.puzzle) return
    this.puzzle = puzzle
    // Send puzzle state as it changes
    const sendState = _.throttle(() => this.send('puzzle-state'), 100)
    this.puzzle.on('letter', sendState)
    this.puzzle.on('cursor', sendState)
    // Send the initial puzzle and state
    if (this._puzzleRequested) {
      this.send('puzzle')
      this._puzzleRequested = false
    }
    this.send('puzzle-state')
  }
}

export default PuzzlePeer
