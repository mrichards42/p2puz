/** @module util/fetch */

import $ from 'jquery'

/**
 * Fetches data using cors-anywhere
 * @param {string} url
 * @returns {Promise} json or plain text response
 *
 * @example
 * fetchProxy('http://example.com/somedata.json')
 *   .then(data => console.log('got somedata', data))
 */
export default function fetchProxy(url) {
  return Promise.resolve($.ajax({
    url: 'https://cors-anywhere.herokuapp.com/' + url,
  }))
}
