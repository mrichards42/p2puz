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
  'AM/PM': d => d.getHours() < 12 ? 'AM' : 'PM',
  'am/pm': d => d.getHours() < 12 ? 'am' : 'pm',
}

const FORMATS_AMPM = {
  hh: d => _fixHour(FORMATS.hh(d), true),
  h:  d => _fixHour(FORMATS.h(d), false),
}

function _fixHour(h, pad) {
  if (h === '00' || h === '0') {
    return '12'
  } else if (h > 12) {
    return pad ? ('0' + (h - 12)).slice(-2) : h - 12
  } else {
    return h
  }
}

const dateRegex = new RegExp(
  Object.keys(FORMATS).sort((a, b) => b.length - a.length).join('|'),
  'g'
)

/**
 * Very basic strftime.
 * @param {Date} [date=new Date()] - date to format
 * @param {string} format - format string
 *
 * @example
 * // Allowed codes: YYYY, MM, DD, hh, mm, ss (and variants)
 * strftime(new Date(), 'YYYY-MM-DD')
 */
export default window.strftime = function(date, format) {
  if (!format && typeof date === 'string') {
    format = date
    date = new Date()
  }
  const cache = {}
  if (typeof date === 'string') date = new Date(date)
  const ampm = /am\/pm/i.test(format)
  return format.replace(
    dateRegex,
    m => (
      cache[m] = cache[m] ||
        (ampm ? FORMATS_AMPM[m] || FORMATS[m] : FORMATS[m])(date)
    ))
}
