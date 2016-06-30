const Symbol = require('es6-symbol')
const KNEX = Symbol.for('knex')

const invariant = require('invariant')
const debug = require('debug')
const log = debug('knex:sql-string')
const defaultEscapeString = require('./util/escape-string')

/**
 * Default escaping for identifiers such as table names.
 * @param  {string} value
 * @return {string}
 */
function defaultEscapeId(value) {
  return value.split('.')
    .map(val => val === '*' ? val : '"' + val + '"')
    .join('.')
}

/**
 * Evaluates
 * @param  {[type]} options [description]
 * @return {[type]}         [description]
 */
function toSQL(target, options = {}) {
  const tagType = target[KNEX]
  const finalOptions = {
    escape: options.escape || defaultEscapeString,
    escapeId: options.escapeId || defaultEscapeId,
    preparing: options.preparing || false,
    withParameters: true,
    timezone: options.timezone || 'Z'
  }
  if (options.withParameters === false) {
    finalOptions.withParameters = false
  }
  if (target === null) {
    return {sql: 'NULL'}
  }
  if (target === undefined) {
    return {sql: ''}
  }
  if (typeof target === 'string') {
    if (finalOptions.withParameters) {
      return {sql: '?', bindings: [target]}
    }
    return {sql: escape(target)}
  }
  invariant(
    tagType,
    'Cannot run toSQL on non-tagged sql statement.'
  )
  invariant(
    typeof finalOptions.escape === 'function',
    'escape must be a function'
  )
  invariant(
    typeof finalOptions.escapeId === 'function',
    'escapeId must be a function'
  )
  invariant(
    typeof target.toSQL === 'function',
    'toSQL must be a function on tagged template %s',
    tagType
  )

  log('@knex:sql-strings', tagType)

  const result = target.toSQL(finalOptions)

  if (result[KNEX]) {
    return toSQL(result, options)
  }

  return result
}

module.exports = toSQL
