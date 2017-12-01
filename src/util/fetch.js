/** @module util/fetch */

/**
 * Fetches data using cors-anywhere
 * @param {string} url
 * @returns {Promise} json or plain text response
 *
 * @example
 * fetchProxy('http://example.com/somedata.json')
 *   .then(data => console.log('got somedata', data))
 */
export default function fetchProxy(url, opts) {
  return fetch('https://cors-anywhere.herokuapp.com/' + url, opts).then(r => {
    if (r.ok) {
      return r
    } else {
      throw new Error(`Network response was not ok: ${r.statusText}`)
    }
  })
}
