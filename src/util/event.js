/**
 * Event emitter base class.
 */
class EventEmitter {
  /**
   * Constructs a new event emitter.
   * @param {...string} eventTypes - events we will emit
   */
  constructor(...eventTypes) {
    this._eventEmitter = this
    this._registerEventTypes(...eventTypes)
  }

  _registerEventTypes(...eventTypes) {
    if (!this._callbacks) this._callbacks = {}
    for (const eventType of eventTypes) {
      if (!this._callbacks[eventType]) this._callbacks[eventType] = []
    }
  }

  /**
   * Adds an event callback.
   * @param {string} eventType - event type
   * @param {function} callback - callback for this event
   * @throws Throws an error if the event type is invalid
   */
  on(eventType, callback) {
    if (this._callbacks[eventType]) {
      this._callbacks[eventType].push(callback)
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
    for (const callback of this._callbacks[eventType]) {
      // setTimeout here insulates this function from errors in the callback
      setTimeout(callback.bind(this, ...args), 0)
    }
  }
}

export default EventEmitter

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
      ;['on', 'emit'].forEach(func => {
        this[func] = (...args) => this._eventEmitter[func](...args)
      })
    }
  }
}
