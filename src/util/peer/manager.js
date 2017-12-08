import EventEmitter from 'SRC/util/event'

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
   * @param {boolean} [opts.autoReconnect] - automatically attempt reconnect
   *                                         when the connection is lost
   */
  constructor({
    broker = require('./broker/pubnub').default,
    autoReconnect = true,
  } = {}) {
    // Events -- connect and 'data:*' events are allowed
    super(...EVENTS, /^data:/)
    this.peer = null
    this.autoReconnect = autoReconnect
    this.brokerConnection = broker
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
    return this.brokerConnection(roomId, userId).then(peer => {
      this.peer = peer
      console.log('connected to remote peer')
      // Hook up peer data callback and send the connect event
      this.peer.on('data', data => this._handleData(data))
      this.emit('connect', peer)
      // Check for peer close
      this.peer.on('close', () => {
        this._connecting = false
        this.peer = null
        if (this.autoReconnect) {
          console.log('peer disconnected -- attempting reconnect')
          this.connect(roomId, userId)
        }
      })
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
   */
  send(type, data) {
    if (this.peer) this.peer.send(JSON.stringify({type, data}))
  }

  _handleData(msg) {
    const {type, data} = JSON.parse(msg)
    this.emit(`data:${type}`, data)
  }
}

export default PeerManager
