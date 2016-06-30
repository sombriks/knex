/*
Adapted from SqlString.js: https://github.com/mysqljs/sqlstring/blob/master/lib/SqlString.js
Copyright (c) 2016 Tim Griesser (tgriesser@gmail.com)
Copyright (c) 2012 Felix Geisendörfer (felix@debuggable.com) and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

const charsRegex = /[\0\b\t\n\r\x1a\"\'\\]/g; // eslint-disable-line
const charsMap = {
  '\0': '\\0',
  '\b': '\\b',
  '\t': '\\t',
  '\n': '\\n',
  '\r': '\\r',
  '\x1a': '\\Z',
  '"': '\\"',
  "'": "\\'",
  '\\': '\\\\'
}

module.exports = function escape(val, timezone = 'Z') {
  if (val === undefined || val === null) {
    return 'NULL'
  }
  switch (typeof val) {
    case 'boolean':
      return (val) ? 'true' : 'false'
    case 'number':
      return val + ''
    case 'object': {
      if (val instanceof Date) {
        val = dateToString(val, timezone)
      }
      else if (Buffer.isBuffer(val)) {
        return bufferToString(val)
      }
      else {
        return JSON.stringify(val)
      }
    }
  }

  return escapeString(val)
}

function dateToString (date, timezone) {
  const dt = new Date(date)
  let year
  let month
  let day
  let hour
  let minute
  let second
  let millisecond

  if (timezone === 'local') {
    year = dt.getFullYear()
    month = dt.getMonth() + 1
    day = dt.getDate()
    hour = dt.getHours()
    minute = dt.getMinutes()
    second = dt.getSeconds()
    millisecond = dt.getMilliseconds()
  } else {
    const tz = convertTimezone(timezone)

    if (tz !== false && tz !== 0) {
      dt.setTime(dt.getTime() + (tz * 60000))
    }

    year = dt.getUTCFullYear()
    month = dt.getUTCMonth() + 1
    day = dt.getUTCDate()
    hour = dt.getUTCHours()
    minute = dt.getUTCMinutes()
    second = dt.getUTCSeconds()
    millisecond = dt.getUTCMilliseconds()
  }

  // YYYY-MM-DD HH:mm:ss.mmm
  return zeroPad(year, 4) + '-' + zeroPad(month, 2) + '-' + zeroPad(day, 2) + ' ' +
    zeroPad(hour, 2) + ':' + zeroPad(minute, 2) + ':' + zeroPad(second, 2) + '.' +
    zeroPad(millisecond, 3)
}

function bufferToString (buffer) {
  return "X'" + buffer.toString('hex') + "'"
}

function escapeString (val) {
  let chunkIndex = charsRegex.lastIndex = 0
  let escapedVal = ''
  let match

  while ((match = charsRegex.exec(val))) {
    escapedVal += val.slice(chunkIndex, match.index) + charsMap[match[0]]
    chunkIndex = charsRegex.lastIndex
  }

  if (chunkIndex === 0) {
    // Nothing was escaped
    return "'" + val + "'"
  }

  if (chunkIndex < val.length) {
    return "'" + escapedVal + val.slice(chunkIndex) + "'"
  }

  return "'" + escapedVal + "'"
}

function zeroPad (number, length) {
  number = number.toString()
  while (number.length < length) {
    number = '0' + number
  }

  return number
}

function convertTimezone (tz) {
  if (tz === 'Z') {
    return 0
  }

  const m = tz.match(/([\+\-\s])(\d\d):?(\d\d)?/)
  if (m) {
    return (m[1] === '-' ? -1 : 1) * (
      parseInt(m[2], 10) + ((m[3] ? parseInt(m[3], 10) : 0) / 60)
      ) * 60
  }
  return false
}
