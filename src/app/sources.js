/** @module app/sources */
import strftime from 'util/strftime'
import SOURCES from './sources.defn'

/**
 * Puzzle source definition.
 * @property {string} url - url template string
 * @property {string} type - puzzle format
 */
class Source {
  constructor(opts) {
    for (const k in opts) this[k] = opts[k]
  }

  /**
   * Gets the url needed to fetch a puzzle.
   * @param {number} [year]
   * @param {number} [month]
   * @param {number} [day]
   * @returns {(string|null)} puzzle url (null if no puzzle for this day)
   */
  getUrl(year, month, day) {
    let date = year ? new Date(+year, +month - 1, +day) : this.mostRecent()
    if (!this.days[date.getDay()]) return
    if (this.fixDate) date = this.fixDate(date)
    return this.url.replace(/\{\{([^}]+)\}\}/, (_, fmt) => strftime(date, fmt))
  }

  /**
   * Returns the most recent date this puzzle was published.
   * @returns {Date}
   */
  mostRecent() {
    const date = new Date()
    let counter = 7
    while (!this.days[date.getDay()] && --counter > 0) {
      date.setDate(date.getDate() - 1)
    }
    return date
  }
}

for (const k in SOURCES) SOURCES[k] = new Source(SOURCES[k])

/**
 * Returns a source definition.
 * @param {string} name - source name
 * @returns {Source}
 *
 * @example
 * const src = getSource('jonesin')
 * const url = src.getUrl(2017, 11, 15)
 * if (url) {
 *   puzzlePresenter.loadPuzzle({type: src.type, url: url})
 *     .then(puzzle => {
 *       // ...
 *     })
 * }
 */
export default function getSource(name) {
  const source = SOURCES[name]
  if (!source) throw new Error(`Unknown source: '${name}'`)
  return source
}
