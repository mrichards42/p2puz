import EventEmitter from 'util/event'
import { PeerManager, EVENTS } from './manager'

/**
 * Peer base class.
 *
 * @example
 * const peerManager = new PeerManager()
 *
 * const chatPeer = new Peer(peerManager)
 * chatPeer.registerDataType('chat-message')
 * chatPeer.on('chat-message',
 *   msg => $('.chat-log').append(`<div>${msg}</div>`))
 *
 * peerManager.connect('some-room')
 *  .then(() => peer.send('chat-message', 'hello world!')
 */
class Peer extends EventEmitter {
  /**
   * Creates a peer
   * @param {PeerManager} manager - manager for this peer
   * @param {object} [dataTypes] - see {@link Peer#registerDataType}
   */
  constructor(manager = new PeerManager(), dataTypes = {}) {
    // Hook up manager events
    super(...EVENTS)
    this.manager = manager
    EVENTS.forEach(evtType => {
      this.manager.on(evtType, (...args) => this.emit(evtType, ...args))
    })
    // Register data types
    this._dataTypes = {}
    for (const type in dataTypes) this.registerDataType(type, dataTypes[type])
  }

  /**
   * Registers a data type event that may be sent and recieved.
   * @param {string} type - data type
   * @param {object} [opts]
   * @param {function} opts.send - function to transform data before sending.
   *                               Takes (data, this) as params.
   * @param {function} opts.recieve - function to transform data after recieving
   *                                  Takes data as the only param.
   * @param {function} opts.default - function to return default data.
   *                                  Takes this as the only param.
   *
   * @example
   * this.registerDataType('my-date', {
   *   send: date => date.toISOString(),
   *   recieve: data => new Date(data),
   * })
   * this.on('my-date', date => console.log('got date!', date.toLocaleString()))
   * this.send('my-date', new Date())
   */
  registerDataType(type, opts) {
    // Don't allow overwriting the default events (e.g. connect)
    if (this.isValidEvent(type)) {
      throw new Error(`An event with type: '${type}' already exists`)
    }
    this.registerEventType(type)
    this._dataTypes[type] = opts || {}
    // Register this data event with the manager
    this.manager.on(`data:${type}`, data => this._handleData(type, data))
  }

  /**
    * Connects to a room (shortcut to {@link PeerManager#connect}).
    * @param {string} roomId - room id
    * @param {string} [userId] - connect as this user
    * @returns {Promise}
    * @fires PeerManager.connect
    */
  connect(roomId, userId = null) {
    return this.manager.connect(roomId, userId)
  }

  /**
   * Registers an event or data listener.
   * @function Peer#on
   * @param {string} eventType - event type
   * @param {function} callback - event callback
   */

  /**
   * Sends data to the remote peer.
   * Fired event depends on the type argument.
   * @param {string} type - message type
   * @param {*} [data] - message payload. If omitted, it will be determined
   *                     based on the message type.
   * @param {boolean} [queue] - queue if there is no connection? Default is set
   *                            in {@link Peer#registerDataType}
   */
  send(type, data = null, queue = null) {
    const funcs = this._dataTypes[type]
    if (!funcs) throw new Error(`Sending unknown data type: ${type}`)
    if (data === null && funcs.default) data = funcs.default(this)
    if (funcs.send) data = funcs.send(data, this)
    this.manager.send(type, data, queue != null ? queue : funcs.queue)
  }

  _handleData(type, data) {
    const funcs = this._dataTypes[type]
    if (!funcs) {
      // This should never happen since we only listen for valid events, which
      // are registered in registerDataType
      throw new Error(`Receiving unknown data type: ${type}`)
    }
    if (funcs.receive) data = funcs.receive(data, this)
    this.emit(type, data)
  }
}

export default Peer
