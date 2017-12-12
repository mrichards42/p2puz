import $ from 'jquery'
import strftime from 'util/strftime'
import Base from 'components/base'
import Peer from './peer'
import './index.scss'

const TEMPLATE = `
  <div class="chat-wrapper">
    <div class="chat-status" />
    <div class="chat-log">
      <div class="chat-welcome">
      </div>
    </div>
    <div class="chat-bar">
      <form action="">
        <input type="text" />
        <button type="submit">Send</button>
      </form>
    </div>
  </div>
`

const CHAT_LOG_TEMPLATE = (msg, date, cssClass) => `
  <div class="chat-message ${cssClass}">
    <span class="chat-text">${msg}</span>
    <span class="chat-timestamp">${strftime(date, 'M/D/YYYY h:mm:ss AM/PM')}</span>
  </div>
`

/**
 * Chat view.
 */
export class ChatView extends Base.View {
  constructor({template = TEMPLATE, ...opts} = {}) {
    super({template, ...opts})
    this.$chatStatus = this.$('.chat-status')
    this.$chatLog = this.$('.chat-log')
    this.$lastChat = $()
    this.$input = this.$('.chat-bar input')
    this.$send = this.$('.chat-bar button')
    this.$send.click(() => {
      const message = this.getInput()
      this.setInput('')
      this.presenter.onSendClick(message)
      this.$input.focus()
    })
    this.setStatus('Disconnected')
  }

  /**
   * Adds a chat message to the log.
   * @param {string} msg - message text
   * @param {number} [timestamp] - message timestamp (ms)
   * @param {string} [cssClass] - class to add to the message
   */
  addChat(msg, timestamp, cssClass = 'chat-self') {
    // Make our css easier by tracking first and last messages from a user
    if (!this.$lastChat.hasClass(cssClass)) {
      this.$lastChat.addClass('chat-last')
      cssClass += ' chat-first'
    }
    // Add message to the chat log
    this.$lastChat = $(CHAT_LOG_TEMPLATE(
      msg,
      timestamp ? new Date(timestamp) : new Date(),
      cssClass
    ))
    this.$chatLog.append(this.$lastChat)
    this.$chatLog.animate({scrollTop: this.$chatLog.height()})
  }

  /**
   * Updates the connection status message.
   * @param {string} status - message
   * @param {string} cssClass - class to use
   */
  setStatus(status, cssClass = '') {
    this.$chatStatus.html(`<div class="${cssClass}">${status}</div>`)
  }

  getInput() {
    return this.$input.val()
  }

  setInput(text) {
    this.$input.val(text)
  }
}

/**
 * Chat presenter class.
 */
class ChatPresenter extends Base.Presenter {
  constructor({el, view = new ChatView(), ...opts} = {}) {
    super({view, el, ...opts})
  }

  /**
   * Handles sending messages to the remote peer.
   * @param {string} message - chat message
   */
  onSendClick(message) {
    this.view.addChat(message)
    if (this.peer) this.peer.send('message', message)
    return false
  }

  // Remote events
  setPeerManager(manager) {
    if (!this.peer) this.setPeer(new Peer(manager))
  }

  setPeer(peer) {
    this.peer = peer
    peer.on('message', (message, timestamp) => {
      this.view.addChat(message, timestamp, 'chat-remote')
    })
    peer.on('connect', () => {
      this.view.setStatus('Connected to peer', 'chat-connected')
    })
    peer.on('close', () => {
      this.view.setStatus('Disconnected from peer')
    })
  }

  getPeer() {
    return this.peer
  }
}

export default ChatPresenter
