/**
 * Event emitter base class.
 */
class EventEmitter {
  /**
   * Constructs a new event emitter.
   * @param {...(string|RegExp|'*')} eventTypes - events we will emit
   */
  constructor(...eventTypes) {
    this._eventEmitter = this
    this._eventRegex = null
    this._registerEventTypes(...eventTypes)
  }

  /**
   * Register an event type.
   * If an unregistered event is passed to {@link EventEmitter.on} or
   * {@link EventEmitter.emit}, it will throw.
   * @param {(string|RegExp|'*')} eventType
   */
  registerEventType(eventType) {
    if (!this._callbacks) this._callbacks = {}
    if (eventType === '*') {
      this._addRegexEvent(/.+/)
    } else if (eventType instanceof RegExp) {
      this._addRegexEvent(eventType)
    } else if (!this._callbacks[eventType]) {
      this._callbacks[eventType] = []
    }
  }

  _registerEventTypes(...eventTypes) {
    for (const eventType of eventTypes) this.registerEventType(eventType)
  }

  _addRegexEvent(regex) {
    regex = `(?:${regex.source})`
    if (this._regexEvents) {
      this._eventRegex = new RegExp(`${this._regexEvents.source}|${regex}`)
    } else {
      this._eventRegex = new RegExp(regex)
    }
  }

  /**
   * Forwards events from another event emitter
   * @param {EventEmitter} other - other emitter
   * @param {(string|RegExp)[]} eventTypes - event types to forward
   */
  forwardEvents(other, ...eventTypes) {
    for (const eventType of eventTypes) {
      this.registerEventType(eventType)
      other.on(eventType, (...args) => this.emit(eventType, ...args))
    }
  }

  /**
   * Is this a valid event type?
   * @param {string} eventType
   * @see EventEmitter.registerEventType
   */
  isValidEvent(eventType) {
    return !!this._callbacks[eventType] ||
      (this._eventRegex && this._eventRegex.test(eventType))
  }

  /**
   * Adds an event callback.
   * @param {(string|RegExp)} eventType - event type
   * @param {function} callback - callback for this event
   * @throws Throws an error if the event type is invalid
   */
  on(eventType, callback) {
    if (eventType instanceof RegExp) {
      if (!this._regexCallbacks) this._regexCallbacks = []
      this._regexCallbacks.push([eventType, callback])
    } else if (this._callbacks[eventType]) {
      this._callbacks[eventType].push(callback)
    } else if (this._eventRegex && this._eventRegex.test(eventType)) {
      this._callbacks[eventType] = [callback]
    } else {
      throw new Error(`Invalid event type: ${eventType}`)
    }
  }

  /**
   * Emits an event, calling any registered callbacks.
   * @param {string} eventType - event type
   * @param {...*} args - arguments to the event callback
   * @see EventEmitter#on
   */
  emit(eventType, ...args) {
    const callbacks = this._callbacksFor(eventType)
    if (!callbacks) {
      if (this.isValidEvent(eventType)) {
        return // valid event but no events are registered
      } else {
        throw new Error(`Invalid event type: ${eventType}`)
      }
    }
    for (const callback of callbacks) {
      // setTimeout here insulates this function from errors in the callback
      setTimeout(callback.bind(this, ...args), 0)
    }
  }

  _callbacksFor(eventType) {
    const callbacks = this._callbacks[eventType]
    // Add regex callbacks
    if (this._regexCallbacks) {
      const regexCallbacks = []
      for (const [regex, callback] of this._regexCallbacks) {
        if (regex.test(eventType)) regexCallbacks.push(callback)
      }
      if (regexCallbacks) return (callbacks || []).concat(regexCallbacks)
    }
    return callbacks
  }
}

export default EventEmitter

const EMITTER_FUNCTIONS = Object.getOwnPropertyNames(EventEmitter.prototype)
  .filter(n => !/^(constructor|_)/.test(n))

/**
 * {@link EventEmitter} as a mixin.
 * @mixin
 * @param {*} Base - base class
 * @param {...string} eventTypes - event types to mix in
 *
 * @example
 *
 * // Declare a class with a base class and mixed-in events
 * class SomeClass extends EventEmitterMixin(BaseClass, 'myevent') {}
 */
export const EventEmitterMixin = (Base, ...eventTypes) => class extends Base {
  constructor(...args) {
    super(...args)
    if (this._eventEmitter) {
      // If this is already an event emitter, register the new types
      this._eventEmitter._registerEventTypes(...eventTypes)
    } else {
      // Otherwise, create a new emitter and delegate its functions
      this._eventEmitter = new EventEmitter(...eventTypes)
      EMITTER_FUNCTIONS.forEach(func => {
        this[func] = (...args) => this._eventEmitter[func](...args)
      })
    }
  }
}
