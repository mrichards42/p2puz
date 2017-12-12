import Peer from 'util/peer'

const DATA_TYPES = {
  /**
   * Chat message event.
   * @event ChatPeer.message
   */
  'message': {
    queue: true,
  },
}

/**
 * A WebRTC peer used for chatting.
 */
class ChatPeer extends Peer {
  constructor(manager, dataTypes = DATA_TYPES) {
    super(manager, dataTypes)
  }
}

export default ChatPeer
