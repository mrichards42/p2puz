/**
 * Load polyfils on-demand
 * @module util/polyfill
 */

function loadScript(src, onSuccess, onError) {
  const js = document.createElement('script')
  js.src = src
  js.onload = function() {
    onSuccess()
  }
  js.onerror = function() {
    const err = new Error(`Failed to load script ${src}`)
    if (onError) {
      onError(err)
    } else {
      throw err
    }
  }
  document.head.appendChild(js)
}

function polyfillUrl(polyfills) {
  return 'https://cdn.polyfill.io/v2/polyfill.js?features=' + polyfills.join(',')
}

/**
 * Loads polyfills
 * @param {string[]} polyfills - list of polyfills to load
 * @param {function} success - called on success
 * @param {function} [err] - called on error (or throws if none)
 *
 * @example
 * loadPolyfills([
 *   'Promise' in window || 'Promise',
 *   'assign' in Object || 'Object.assign'
 * ], function() {
 *   // Run the app
 * })
 */
export default function loadPolyfills(polyfills, success, err) {
  polyfills = polyfills.filter(v => typeof v === 'string')
  if (polyfills.length) {
    return loadScript(polyfillUrl(polyfills), success, err)
  } else {
    success()
  }
}
