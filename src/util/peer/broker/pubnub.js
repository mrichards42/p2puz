/**
 * PubNub peer broker
 * @module util/peer/connector/pubnub
 */
import _ from 'lodash'
import localforage from 'localforage'
import PubNub from 'pubnub'
import SimplePeer from 'simple-peer'

const UUID_KEY = 'PubNubPeer.UUID'

export default function connectPeer(roomId, userId, remoteId) {
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
          resolve(peer) // we're done
        })
        peer.on('error', err => {
          pubnub.stop()
          reject(err)
        })
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
                // Ignore remote pings until we've seen our own ping.  This
                // prevents a race where two peers that subscribed to pubnub
                // at the same time could both attempt to initiate connections.
                if (pingCount > 0) {
                  // Sombody new joined -- create a peer and send an offer
                  peer = peer || createPeer(publisher, true)
                }
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
