/** @module util/fetch */

/**
 * Fetches data using a Netlify proxy
 * @param {string} url
 * @returns {Promise} json or plain text response
 *
 * @example
 * fetchProxy('http://example.com/somedata.json')
 *   .then(data => console.log('got somedata', data))
 */
export default function fetchProxy(url, opts) {
  return fetch('/fetch/' + url.replace(/^https?:\/\//, ''), opts).then(r => {
    if (r.ok) {
      return r
    } else {
      throw new Error(`Network response was not ok: ${r.statusText}`)
    }
  })
}
