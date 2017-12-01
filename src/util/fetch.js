/** @module util/fetch */

import $ from 'jquery'
import base64buf from 'base64-arraybuffer'

/**
 * Fetches data using jsonp.net
 * @param {(object|string)} opts - url or options object (passed to jsonp.net)
 * @param {string} opts.url - url (if using an options object)
 * @param {boolean} [opts.arraybuffer] - return data as an ArrayBuffer
 * @returns {Promise} plain text response
 *
 * @example
 * fetchProxy('http://example.com/somedata.json')
 *   .then(data => console.log('got somedata', data))
 */
export default function fetchProxy(opts) {
  const CALLBACK = '_fetch_proxy_callback_'

  if (typeof opts === 'string') opts = {url: opts}
  opts.method = opts.method || 'GET'
  opts.callback = opts.callback || CALLBACK
  opts.url = opts.url.replace('callback=?', 'callback=' + opts.callback)

  // Fetch ArrayBuffer in base64 (then decode later)
  const arraybuffer = opts.arraybuffer
  delete opts.arraybuffer
  if (arraybuffer) opts.encoding = 'base64'

  const proxyUrl = 'http://api.jsonp.net/?' +
    encodeURIComponent(JSON.stringify(opts))

  return $.ajax({
    url: proxyUrl,
    dataType: 'jsonp',
    jsonp: false,
    cache: true,
    jsonpCallback: opts.callback,
  }).then(data => {
    data = data.body
    // Handle jsonp
    if (/callback=/.test(opts.url)) {
      data = data.slice(opts.callback.length + 1, -1)
    }
    if (arraybuffer) {
      return base64buf.decode(data)
    } else {
      return data
    }
  })
}
