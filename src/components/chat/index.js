import $ from 'jquery'
import strftime from 'util/strftime'
import { EventEmitterMixin } from 'util/event'
import Base from 'components/base'
import Peer from './peer'
import './index.scss'

// Replace links to clues in message text
const ORIENTATION = {across: 'across', down: 'down', a: 'across', d: 'down'}
const clueRegex = /(\d+)\.?\s*(across|down|a\b|d\b)/ig
const linkForClue = (text, number, orientation) => `
  <a class="chat-clue-link" href="javascript:void(0)"
      data-number="${number}"
      data-orientation="${ORIENTATION[orientation.toLowerCase()]}">
    ${text}
  </a>
`
function replaceClueLinks(msg) {
  return msg.replace(clueRegex, linkForClue)
}

const TEMPLATE = `
  <div class="chat-wrapper">
    <div class="chat-status" />
    <div class="chat-log">
      <div class="chat-welcome">
        <p>Use this space to chat with your peer. If you send a message with a
        clue number, it will appear as a link:</p>
        <p>E.g. ${replaceClueLinks('1 across')}, ${replaceClueLinks('2d')}</p>
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
      if (/^\s*$/.test(message)) return false // prevent empty messages
      this.setInput('')
      this.presenter.onSendClick(message)
      this.$input.focus()
    })
    this.$el.on('click', 'a.chat-clue-link', e => {
      const $a = $(e.currentTarget)
      this.presenter.onLinkClick($a.data('number'), $a.data('orientation'))
      return false
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
    // Check the message for clue links
    msg = replaceClueLinks(msg)
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
class ChatPresenter extends EventEmitterMixin(Base.Presenter, 'link') {
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

  onLinkClick(number, orientation) {
    this.emit('link', number, orientation)
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
