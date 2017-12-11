/** @module util/strftime */

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
]

const FORMATS = {
  YYYY: d => d.getFullYear(),
  YY:   d => ('' + d.getFullYear()).slice(-2),
  MMMM: d => MONTHS[d.getMonth()],
  MMM:  d => MONTHS[d.getMonth()].slice(0, 3),
  MM:   d => ('0' + (d.getMonth() + 1)).slice(-2),
  M:    d => d.getMonth() + 1,
  DDDD: d => DAYS[d.getDay()],
  DDD:  d => DAYS[d.getDay()].slice(0, 3),
  DD:   d => ('0' + d.getDate()).slice(-2),
  D:    d => d.getDate(),
  hh:   d => ('0' + d.getHours()).slice(-2),
  h:    d => d.getHours(),
  mm:   d => ('0' + d.getMinutes()).slice(-2),
  m:    d => d.getMinutes(),
  ss:   d => ('0' + d.getSeconds()).slice(-2),
  s:    d => d.getSeconds(),
}

const dateRegex = new RegExp(
  Object.keys(FORMATS).sort((a, b) => b.length - a.length).join('|'),
  'g'
)

/**
 * Very basic strftime.
 * @param {Date} date - date to format
 * @param {string} format - format string
 *
 * @example
 * // Allowed codes: YYYY, MM, DD, hh, mm, ss (and variants)
 * strftime(new Date(), 'YYYY-MM-DD')
 */
export default function(date, format) {
  const cache = {}
  if (typeof date === 'string') date = new Date(date)
  return format.replace(
    dateRegex,
    m => (cache[m] = cache[m] || FORMATS[m](date))
  )
}
