import EventEmitter from 'util/event'

export const EVENTS = [
  /**
   * Connection established event.
   * @event PeerManager.connect
   * @param {SimplePeer} peer - remote peer
   */
  'connect',
  /**
   * Connection closed event.
   * @event PeerManager.close
   */
  'close',
  /**
   * Connection error event.
   * @event PeerManager.error
   * @param {Error} err - error message
   */
  'error',
  /**
   * Video/audio stream recieved event.
   * @event PeerManager.stream
   * @param {*} stream - video or audio stream.
   */
  'stream',
]
/**
 * Data recieved event.
 * @event PeerManager.data:*
 * @param {*} data - data for this event type
 * @see Peer#registerDataType
 */

/**
 * A SimplePeer manager
 *
 * @see Peer
 *
 * @example
 *
 * // Connect to a remote peer
 * const mgr = new PeerManager()
 * mgr.connect('myroom', 'user-name')
 * mgr.on('connect', (simplePeer) => {
 *  console.log('connected!', simplePeer)
 * })
 *
 * // Handle remote data
 * mgr.on('data:my-message', (data) => console.log('got data!', data))
 *
 * // Send data to the remote mgr
 * mgr.send('my-message', 'some data!')
 */
class PeerManager extends EventEmitter {
  /**
   * Constructs a new PeerManager
   * @param {object} opts
   * @param {function} [opts.broker] - function that takes a room and user id
   *                                   and returns a SimplePeer Promise.
   * @param {number} [opts.autoReconnect] - times to attempt autoreconnect
   *                                         when the connection is lost
   */
  constructor({
    broker = require('./broker/pubnub').default,
    autoReconnect = 10,
  } = {}) {
    // Events -- connect and 'data:*' events are allowed
    super(...EVENTS, /^data:/)
    this.peer = null
    this.autoReconnect = autoReconnect
    this._connectTries = 0
    this.brokerConnection = broker
    this._queue = []
  }

  /**
    * Connects to the first user that enters a given room.
    * @param {string} roomId - room id
    * @param {string} [userId] - connect as this user
    * @returns {Promise}
    * @fires PeerManager.connect
    */
  connect(roomId, userId = 'unknown') {
    // Guard against calling this multiple times
    if (this._connecting) return Promise.resolve(this.peer)
    this._connecting = true
    this.peer = null
    this._connectTries++
    return this.brokerConnection(roomId, userId).then(peer => {
      this.peer = peer
      this._connectTries = 0
      console.log('connected to remote peer')
      // Hook up peer data callback and send the connect event
      this.peer.on('data', data => this._handleData(data))
      this.emit('connect', peer)
      // Check for peer close
      this.peer.on('close', () => {
        this.emit('close')
        this._connecting = false
        this.peer = null
        if (this.autoReconnect) {
          console.log('peer disconnected -- attempting reconnect')
          this.connect(roomId, userId)
        }
      })
      // Flush queued messages
      if (this._queue.length) {
        // Send flush time for timestamped messages
        this.peer.send(JSON.stringify({
          type: 'time-sync', timestamp: new Date().getTime(),
        }))
        for (const msg of this._queue) this.peer.send(msg)
        this._queue = []
      }
    }).catch(err => {
      // Reconnect on errors
      this._connecting = false
      this.peer = null
      console.log('Error connecting', err)
      if (this._connectTries <= this.autoReconnect) {
        console.log(
          'attempting reconnect',
          `(try ${this._connectTries} of ${this.autoReconnect})`
        )
        this.connect(roomId, userId)
      } else {
        console.log(`reconnect failed ${this.autoReconnect} times; giving up`)
      }
    })
  }

  /**
   * Registers an event listener
   * @function PeerManager#on
   * @param {string} eventType - event type
   * @param {function} callback - event callback
   */

  /**
   * Sends data to the remote peer.
   * A data event will be fired on the remote peer, not on the local peer.
   * @param {string} type - message type
   * @param {*} data - arbitrary data to send
   * @param {boolean} [queue] - should this be queued if we're disconnected?
   */
  send(type, data, queue = false) {
    if (this.peer) {
      this.peer.send(JSON.stringify({type, data}))
    } else if (queue) {
      const timestamp = new Date().getTime()
      this._queue.push(JSON.stringify({type, data, timestamp}))
    }
  }

  _handleData(msg) {
    let {type, data, timestamp} = JSON.parse(msg)
    // If we got a time-sync message (before a queue flush), fix the timestamp
    if (type === 'time-sync') {
      this._remoteOffset = new Date().getTime() - timestamp
    } else if (timestamp) {
      timestamp += this._remoteOffset || 0
    }
    this.emit(`data:${type}`, data, timestamp)
  }
}

export default PeerManager
