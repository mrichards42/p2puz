import $ from 'jquery'
import Base from 'SRC/components/base'
import Metadata from '../puzzle/metadata'
import './index.scss'

const TOOLBAR_TEMPLATE = `
  <div class="puzzle-toolbar">
  </div>
`

export class ToolbarView extends Base.View {
  constructor({template = TOOLBAR_TEMPLATE, ...opts} = {}) {
    super({template, ...opts})
  }

  addTool(view) {
    this.$el.append(view.$el)
  }
}

/**
 * Toolbar class.
 */
class ToolbarPresenter extends Base.Presenter {
  constructor({view = new ToolbarView(), ...opts} = {}) {
    super({view, ...opts})
    this.puzzle = null
    this.tools = []
  }

  setPuzzle(puzzle) {
    this.puzzle = puzzle
    for (const tool of this.tools) {
      if (tool.setPuzzle) tool.setPuzzle(puzzle)
    }
  }

  /**
   * Clears existing tools and sets new tools.
   * @param {(object[]|Presenter[])} tools - tool definitions or presenters
   * @see ToolbarPresenter#addTool
   */
  setTools(tools = []) {
    this.view.clear()
    this.tools = []
    for (const tool of tools) {
      this.addTool(tool)
    }
  }

  /**
   * Adds a tool to the toolbar
   * @param {(object|Presenter)} tool - tool definition or Presenter
   * @param {string} tool.label - menu label (or tooltip if html is set)
   * @param {string} [tool.html] - item html override (default: label)
   * @param {object} [tool.events] - event mapping
   * @param {(object[]|Presenter[])} [tool.items] - sub items
   *
   * @example
   * // Add a tool from a definition
   * toolbar.addTool({
   *   label: 'info',
   *   html: '<i class="fa fa-info" />', // font-awesome icon
   *   events: {
   *     click: (puzzle) => {
   *       alert(`Puzzle title: ${puzzle.meta.title}`)
   *     }
   *   }
   * })
   *
   * // Dropdown
   * toolbar.addTool({
   *   label: 'check',
   *   items: [
   *     {label: 'check letter'},
   *     {label: 'check word'},
   *     {label: 'check grid'},
   *   ]
   * })
   *
   * // Add an existing presenter
   * toolbar.addTool(new Metadata({format: meta => meta.title}))
   *
   * // Shortcut to the above
   * toolbar.addTool({html: meta => meta.title})
   */
  addTool(tool) {
    tool = this._makeTool(tool)
    this.view.addTool(tool.view)
    this.tools.push(tool)
  }

  _makeTool(opts) {
    if (opts instanceof Base.Presenter) return opts
    let tool
    if (typeof opts.html === 'function') {
      tool = new Metadata({format: opts.html, class: opts.class})
    } else {
      // Just a one-off class with a template
      tool = new Base.Presenter({
        view: new Base.View({template: TOOL_TEMPLATE(opts)}),
      })
    }
    // Add sub-items
    if (opts.items) {
      tool.$el.addClass('toolbar-menu')
      tool.$el.click(() => {
        tool.$el.toggleClass('toolbar-menu-show')
        return false
      })
      const $submenu = $('<div class="toolbar-submenu">').appendTo(tool.$el)
      for (const subitem of (opts.items || [])) {
        const subtool = this._makeTool(subitem)
        $submenu.append(subtool.$el)
        this.tools.push(subtool)
      }
    }
    // Attach events
    for (const evtName in opts.events || {}) {
      const handler = opts.events[evtName]
      tool.$el.on(evtName, () => {
        handler(this.puzzle)
        return false
      })
    }
    return tool
  }
}

const TOOL_TEMPLATE = opts => `
  <div class="toolbar-tool ${opts.class || ''}"
      ${opts.style ? `style="${opts.style}"` : ''}
      ${opts.label ? `title="${opts.label}"` : ''}>
    <span>${opts.html || opts.label}</span>
  </div>
`

export default ToolbarPresenter
