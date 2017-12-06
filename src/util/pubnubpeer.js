import _ from 'lodash'
import localforage from 'localforage'
import PubNub from 'pubnub'
import SimplePeer from 'simple-peer'
import EventEmitter from 'SRC/util/event'

/**
 * A WebRTC peer using PubNub for brokering.
 *
 * @example
 *
 * // Connect to a remote peer
 * const peer = new PubNubPeer()
 * peer.connect('myroom', 'user-name')
 * peer.on('connect', (simplePeerObject) => {
 *  console.log('connected!')
 * })
 *
 * // Handle remote data
 * peer.on('data', (data) => console.log('got data!'))
 *
 * // Send data to the remote peer
 * peer.send('some data!')
 */
class PubNubPeer extends EventEmitter {
  constructor({reconnect = true} = {}) {
    super('connect', 'data') // Events we will handle
    this.peer = null
    this.reconnect = reconnect
  }

  /**
    * Connects to the first user that enters a given room.
    * @param {string} roomId - room id
    * @param {string} [userId] - connect as this user
    * @fires PubNubPeer.connect
    */
  connect(roomId, userId = 'unknown') {
    // Guard against calling this multiple times
    if (this._connecting) return
    this._connecting = true
    this.peer = null
    _connectPeer(roomId, userId).then(peer => {
      this.peer = peer
      console.log('connected to remote peer')
      // Hook up peer data callback and send the connect event
      this.peer.on('data', data => { this.emit('data', data) })
      this.emit('connect', peer)
      // Check for peer close
      this.peer.on('close', () => {
        // Attempt to reconnect
        if (this.reconnect) {
          console.log('peer disconnected -- attempting reconnect')
          this._connecting = false
          this.connect(roomId, userId)
        }
      })
    })
  }

  /**
   * Sends data to the remote peer.
   * An event will be fired on the remote peer, not on the local peer.
   * @param {*} data - arbitrary data to send
   * @fires PubNubPeer.data
   */
  send(data) {
    this.peer.send(data)
  }
}

/**
 * Connection established event.
 * @event PubNubPeer.connect
 * @param {SimplePeer} peer - remote peer
 */

/**
 * Data received event.
 * @event PubNubPeer.data
 * @param {*} data - message payload
 */

export default PubNubPeer

const UUID_KEY = 'PubNubPeer.UUID'

// Implementation of PubNubPeer.connect
function _connectPeer(roomId, userId, remoteId) {
  return new Promise((resolve, reject) => {
    localforage.getItem(UUID_KEY).then(uuid => {
      if (!uuid) {
        uuid = PubNub.generateUUID()
        localforage.setItem(UUID_KEY, uuid)
      }
      userId = userId + '@' + uuid
      const pubnub = new PubNub({
        subscribeKey: 'sub-c-0f6fdcd4-c8a0-11e7-8c50-5af512f03656',
        publishKey: 'pub-c-ca7b3f31-f860-4fad-b50c-8af521080167',
        uuid: uuid,
        ssl: true,
      })

      // Create a SimplePeer used for connecting to a given remote peer
      let peer = null
      function createPeer(remoteId, initiator) {
        const peer = new SimplePeer({initiator: initiator})
        peer.remoteId = remoteId
        peer.on('signal', data => {
          // Publish the offer or response to the private channel of
          // whoever we're trying to connect to
          pubnub.publish({
            channel: roomId + '/' + remoteId,
            message: {user: userId, type: 'signal', signal: data},
          })
        })
        peer.on('connect', () => {
          // Shut down pubnub since we don't need it anymore
          pubnub.stop()
          // we're done here
          resolve(peer)
        })
        peer.on('error', reject)
        return peer
      }

      let pingCount = 0
      // Connect to events
      pubnub.addListener({
        status: function(statusEvent) {
          if (statusEvent.category === 'PNConnectedCategory') {
            // Announce that we're here
            pubnub.publish({
              channel: roomId + '/public',
              message: {user: userId, type: 'ping'},
            })
          }
        },
        message: function(m) {
          if (!_.isObject(m.message) || !m.message.user) {
            console.log('Unknown message format!', m)
            return
          }
          const publisher = m.message.user
          switch (m.message.type) {
            case 'ping':
              if (publisher === userId) {
                // Expect one and only one ping from our userId.  If we get a
                // second ping, that means the user opened this page twice.
                // We can only connect two peers at a time, so we can't have
                // multiple peers with the same id attempting to connect to
                // a remote peer.
                if (++pingCount > 1) {
                  console.log('page opened twice! stopping this instance')
                  pubnub.stop()
                  reject(new Error('Attempt to connect to self'))
                }
              } else {
                // Sombody new joined -- create a peer and send an offer
                peer = peer || createPeer(publisher, true)
              }
              break
            case 'signal':
              if (publisher === userId) {
                console.log('got a signal from ourself... how did this happen?')
                break
              }
              // If we don't have a peer this is a new offer, otherwise it's
              // a response to our offer.  Either way, simple-peer just asks
              // that we call peer.signal
              peer = peer || createPeer(publisher, false)
              peer.signal(m.message.signal)
              break
            default:
              console.log('Unknown message type!', m)
          }
        },
      })

      console.log('Connecting to PubNub as', userId)
      console.log(
        'Subscribing to rooms: ',
        roomId + '/public',
        roomId + '/' + userId
      )

      pubnub.subscribe({
        channels: [
          // Public room: used for pings
          roomId + '/public',
          // Private room: used for signalling
          roomId + '/' + userId,
        ],
      })
    }).catch(reject)
  })
}
