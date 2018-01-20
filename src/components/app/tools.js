import strftime from 'util/strftime'
import FilePresenter from 'components/file'

/**
 * Builds a tool definition from a string, function, or object.
 * @param {AppPresenter} app - the app
 * @param {(object|string|function)} tool - tool definition
 */
export function makeTool(app, toolbar, tool) {
  if (typeof tool === 'string') {
    const name = tool
    tool = DEFAULT_TOOLS[name]
    if (!tool) throw new Error(`No default tool '${name}'`)
  }
  if (typeof tool === 'function') {
    return tool(app, toolbar)
  } else {
    return tool
  }
}

/** The title toolbar item. */
function title(app, toolbar) {
  const TITLE_FORMAT = ({title, date, author, editor, copyright}) => {
    // Normalize title
    if (!title && date) title = strftime(date, '<b>DDDD</b>, MMMM D, YYYY')
    // Normalize author and editor
    if (!editor) [, author, editor] = author.match(/(.*)\/(.*)/) || ['', author]
    if (author) author = 'By ' + author.replace(/^\s*by\s+/i, '')
    if (editor) editor = 'Edited by ' + editor.replace(/^\s*\w*\s*by\s+/i, '')
    author = author && editor ? author + ' \u25AA ' + editor : author || editor
    // Normalize copyright
    if (copyright && !/\u00A9/.test(copyright)) {
      copyright = '\u00A9 ' + copyright.replace(/^\s*\(c\)\s*/i, '')
    }
    // Template
    return `
      <span class="meta-title">${title || ''}</span>
      <span class="meta-author">${author || ''}</span>
      <span class="meta-copyright">${copyright || ''}</span>
    `
  }
  return {
    html: TITLE_FORMAT,
    class: 'toolbar-puzzle-title',
  }
}

/** The rebus toolbar item. */
function rebus(app, toolbar) {
  function toggle(tool, state) {
    // The rebus is submitted on input blur, so if the user clicks the toolbar
    // button to dismiss the rebus, the following happens:
    // (1) the input is blurred, submitting the rebus
    // (2) the rebus input is hidden, toggling the state of the button
    // (3) the button is clicked, showing the rebus input again
    // In order to prevent (3) from happening, we ignore clicks for a short
    // time after the rebus input is toggled
    if (!tool._preventClick) toolbar.toggleTool(tool, state)
    tool._preventClick = true
    setTimeout(() => { tool._preventClick = false }, 100)
  }

  return {
    label: 'rebus',
    events: {
      click: (e, tool, toolbar) => {
        if (!tool._preventClick) {
          app.puzzlePresenter.toggleRebus()
          toggle(tool)
        }
      },
    },
    setup: (tool, toolbar) => {
      app.on('rebus-show', () => toggle(tool, true))
      app.on('rebus-hide', () => toggle(tool, false))
    },
  }
}

/** The check toolbar item. */
function check(app, toolbar) {
  return {
    label: 'check',
    events: {
      click: (e, tool, toolbar) => {
        // Using auto-check here is quick and dirty.  This really needs to be a
        // check square/word/grid drop-down that is persistent.
        app.puzzlePresenter.toggleAutoCheck()
        toolbar.toggleTool(tool)
      },
    },
  }
}

/** The p2p toolbar item. */
function p2p(app, toolbar) {
  return {
    label: 'p2p',
    events: {
      click: () => app.toggleSidebar(app.chat),
    },
  }
}

/** The open file toolbar item. */
function open(app, toolbar) {
  const file = new FilePresenter({label: 'open', accept: '.puz'})
  file.$el.addClass('toolbar-tool')
  file.on('file', (name, data) => {
    const [type] = name.match(/[^.]+$/) || ['']
    console.log('got file!', type, name, data)
    app.loadPuzzle({type, data})
  })
  return file
}

const DEFAULT_TOOLS = {title, rebus, p2p, open, check}
export default DEFAULT_TOOLS
