import $ from 'jquery'

/**
 * Base class for Presenters and Views.
 * @private
 */
class ElementContainer {
  /**
   * Shortcut to <code>this.$el.find(selector)</code>.
   * @param {string} selector - css selector string
   * @returns {jQuery}
   */
  $(selector) {
    return this.$el.find(selector)
  }

  /**
   * Appends a child element to this element.
   * @param {(View|Presenter|Node|jQuery|selector)} child - child view to add
   * @returns this
   */
  append(child) {
    this.$el.append(this._as$(child))
    return this
  }

  /**
   * Appends this element to a parent element.
   * @param {(View|Presenter|Node|jQuery|selector)} parent - parent to append to
   * @returns this
   */
  appendTo(parent) {
    this.$el.appendTo(this._as$(parent))
    return this
  }

  /**
   * Clears the element.
   * @returns this
   */
  clear() {
    this.$el.empty()
    return this
  }

  /**
   * Removes this element from the dom.
   * @returns this
   */
  remove() {
    this.$el.remove()
    return this
  }

  _as$(item) {
    return item instanceof ElementContainer ? item.$el : $(item)
  }

  /**
   * Toggles the element
   * @param {boolean} [state] - force show or hide
   * @returns this
   */
  toggle(state) {
    if (state == null) state = this.$el.css('display') === 'none'
    // Don't just $el.toggle() in case show or hide is overridden
    if (state) {
      return this.show()
    } else {
      return this.hide()
    }
  }

}

/**
 * Base View class
 * @extends ElementContainer
 *
 * @example
 * // Set default constructor options using the object spread operator:
 * class MyView extends Base.View {
 *   constructor({template = '<div id="myview">', ...opts}) {
 *     super({template, ...opts})
 *   }
 * }
 */
class View extends ElementContainer {
  /**
   * Creates a new view
   * @param {object} opts options
   * @param {string} [opts.template] html string template for this view
   */
  constructor(opts = {}) {
    super()
    /**
     * The dom node for this view
     * @type {jQuery}
     */
    this.$el = $(opts.template || '<div>')
  }

  /**
   * Sets the presenter for this view.
   * Called automatically by the {@link Presenter} constructor
   * @param {Presenter} presenter - presenter for this view
   */
  setPresenter(presenter) {
    /**
     * The view's presenter.
     * @member {Presenter}
     */
    this.presenter = presenter
  }

  /**
   * Hides the element
   * @returns this
   */
  hide() {
    this.$el.hide()
    return this
  }

  /**
   * Shows the element
   * @returns this
   */
  show() {
    this.$el.show()
    return this
  }

  /**
   * Updates classes with a prefix.
   * This removes any classes set using this function with the same prefix,
   * then adds new classes.
   * @param {string} prefix - css class prefix
   * @param {string} classes - space separated classes
   * @returns this
   *
   * @example
   * // class="layout-a layout-b layout-c"
   * view.setExclusiveClass('layout', 'a b c')
   * // class="layout-d layout-e" (a, b, c removed)
   * view.setExclusiveClass('layout', 'd e')
   */
  setExclusiveClass(prefix, classes) {
    classes = classes.split(' ').map(c => prefix + '-' + c).join(' ')
    const key = '_classes_' + prefix
    const oldClasses = this[key]
    if (oldClasses === classes) return
    if (oldClasses) this.$el.removeClass(oldClasses)
    this.$el.addClass(classes)
    this[key] = classes
    return this
  }

  /**
   * Returns true if this view has the given exclusive class.
   * @param {string} prefix css class prefix
   * @param {string} classes space separated classes
   * @see View#setExclusiveClass
   */
  hasExclusiveClass(prefix, classes) {
    classes = classes.split(' ').map(c => prefix + '-' + c).join(' ')
    const key = '_classes_' + prefix
    const pat = new RegExp('(?:^| )' + classes + '(?:$| )')
    return pat.test(this[key] || '')
  }
}

/**
 * Base Presenter class
 * @extends ElementContainer
 *
 * @example
 * // Set default constructor options using the object spread operator:
 * class MyPresenter extends Base.Presenter {
 *   constructor({view = new MyView(), ...opts}) {
 *     super({view, ...opts})
 *   }
 * }
 */
class Presenter extends ElementContainer {
  /**
   * Creates a new presenter
   * @param {object} opts
   * @param {View} opts.view - view for this presenter
   * @param {(Node|jQuery|selector)} [opts.el] - append the view to this node
   */
  constructor(opts = {}) {
    super()
    if (!opts.view) throw new Error('view is required')
    /**
     * The presenter's view.
     * @member {View}
     */
    this.view = opts.view
    this.view.setPresenter(this)
    if (opts.el) {
      $(opts.el).append(this.$el)
    }
  }

  /**
   * DOM element for the view.
   * @type {jQuery}
   */
  get $el() {
    return this.view.$el
  }

  // hide and show use the view so that view can override these methods

  /**
   * Hides the element
   * @returns this
   */
  hide() {
    this.view.hide()
    return this
  }

  /**
   * Shows the element
   * @returns this
   */
  show() {
    this.view.show()
    return this
  }

  /**
   * Toggles the element
   * @returns this
   */
}

export default {View, Presenter}
