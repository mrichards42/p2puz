import strftime from 'util/strftime'

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

/** The p2p toolbar item. */
function p2p(app, toolbar) {
  return {
    label: 'p2p',
    events: {
      click: () => app.toggleSidebar(app.chat),
    },
  }
}

const DEFAULT_TOOLS = {title, p2p}
export default DEFAULT_TOOLS
