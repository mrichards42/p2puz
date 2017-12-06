import _ from 'lodash'
import { EventEmitterMixin } from 'SRC/util/event'
import PubNubPeer from 'SRC/util/pubnubpeer'
import Puzzle from 'SRC/models/puzzle'

const DEBUG = false

const EVENTS = {
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
    send: peer => peer.puzzle.save('json'),
    receive: data => Puzzle.load('json', data),
  },
  /**
   * Puzzle state updated event.
   * @event PuzzlePeer.puzzle-state
   * @param {PuzzleState} state - the new state
   */
  'puzzle-state': {
    send: peer => peer.puzzle.state,
  },
}

/**
 * A WebRTC peer used for syncing {@link Puzzle} state
 * @extends PubNubPeer
 * @extends EventEmitter
 */
class PuzzlePeer extends EventEmitterMixin(PubNubPeer, ...Object.keys(EVENTS)) {
  constructor() {
    super()
    this.puzzle = null
    // If the peer connects after the puzzle is set, make sure we register
    this.on('connect', () => this.registerPuzzleListeners())
    // Handle data
    this.on('data', msg => {
      msg = JSON.parse(msg)
      if (DEBUG) console.log('receive', msg)
      if (msg.type in EVENTS) {
        // Apply receive transformation before dispatching the event
        const transform = (EVENTS[msg.type] || {}).receive
        this.emit(msg.type, transform ? transform(msg.data) : msg.data)
      } else {
        console.log('unknown PuzzlePeer message!', msg)
      }
    })
    // Handle puzzle requests
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
   * Sets the puzzle.
   * @param {Puzzle} puzzle
   */
  setPuzzle(puzzle) {
    this.puzzle = puzzle
    if (this.peer && this.puzzle) this.registerPuzzleListeners()
  }

  registerPuzzleListeners() {
    if (!this.puzzle || !this.peer) return
    // Send puzzle state as it changes
    const sendState = _.throttle(() => this.send('puzzle-state'), 100)
    this.puzzle.on('letter', sendState)
    this.puzzle.on('cursor', sendState)
    // Send the first event
    if (this._puzzleRequested) {
      this.send('puzzle')
      this._puzzleRequested = false
    }
    this.send('puzzle-state')
  }

  /**
   * Sends data to the remote peer.
   * Fired event depends on the type argument.
   * @param {string} type - message type
   * @param {*} [data] - message payload. If omitted, it will be determined
   *                     based on the message type and the current puzzle.
   * @fires PuzzlePeer.event:request-puzzle
   * @fires PuzzlePeer.event:puzzle
   * @fires PuzzlePeer.event:puzzle-state
   *
   * @example
   * peer.send('puzzle-state')                // Send the current puzzle state
   * peer.send('puzzle-state', somePuz.state) // Send a specific puzzle's state
   */
  send(type, data = null) {
    if (DEBUG) console.log('send', type)
    if (!(type in EVENTS)) {
      throw new Error('Sending unknown event type: ' + (type || '(null)'))
    }
    if (data === null) {
      const transform = (EVENTS[type] || {}).send
      if (transform) data = transform(this)
    }
    super.send(JSON.stringify({type, data}))
  }
}

export default PuzzlePeer
