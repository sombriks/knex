/**
 * @module 'knex/strings'
 */

// Use the "knex" symbol registry name for tagging symbols which
// should be interpreted in the toSQL builder.
const Symbol = require('es6-symbol')
const KNEX = Symbol.for('knex')

const invariant = require('invariant')
const shallowEquals = require('shallow-equals')
const toSQL = require('./to-sql')

exports.toSQL = toSQL

/**
 * Internal helper, creates an object literal tagged with
 * the Symbol('knex'), which allows it to be special cased
 * when constructing sql.
 * @param  {string} type
 * @param  {any} value
 * @param  {any} params
 * @return {Object}
 */
function tag(type, toSQLFn) {
  return {
    [KNEX]: type,
    // https://github.com/facebook/flow/issues/810
    __knexSymbol: type,
    toSQL: toSQLFn,
    toString(options) {
      return toSQL(this, Object.assign({}, options, {withParameters: true}))
    }
  }
}

const EMPTY_STRING = /^ *\n/
const INDENTATION = /^ +/

/**
 * Tagged template helper for generating properly
 * parameterized SQL statements, interpolating additional
 * complex sql object.
 *
 * @example
 *
 * sql`SELECT * FROM ${ident('accounts')} WHERE id = ${value}`
 *
 * @param  {Array} strings Array of strings
 * @param  {...any} values  Values to be combined with the
 * @return {Object}
 */
function sql(strings, ...values) {
  invariant(
    Array.isArray(strings),
    '"sql" may only be used as a template function, saw %s',
    strings
  )
  let cachedSQL, cachedOptions

  const sqlString = {
    [KNEX]: 'sqlString',
    toSQL(options) {
      let bindings = []
      let finalStrings = strings
      let finalSql = finalStrings[0]
      while (EMPTY_STRING.test(finalSql)) {
        finalSql = finalSql.replace(EMPTY_STRING, '')
      }
      if (INDENTATION.test(finalSql)) {
        const [indent] = INDENTATION.exec(finalSql)
        const REPLACE = new RegExp(`^${indent}`)
        finalStrings = finalStrings.map(str => {
          return str.split('\n').map(v => v.replace(REPLACE, '')).join('\n')
        })
        finalSql = finalStrings[0]
      }
      for (let i = 0; i < values.length; i++) {
        let val = values[i]
        if (val && !val[KNEX]) {
          val = param(val)
        }
        const result = toSQL(val, options)
        if (result.bindings) {
          bindings = bindings.concat(result.bindings)
        }
        finalSql += result.sql + finalStrings[i + 1]
      }

      const result = {
        sql: finalSql.trim(),
        hooks: {},
        method: options.method || 'unknown',
        bindings
      }
      return result
    }
  }

  const result = {
    [KNEX]: 'sql',
    toString (options) {
      return result.toSQL(
        Object.assign({}, options, {withParameters: false})
      ).sql
    },
    toSQL (options) {
      if (cachedSQL && shallowEquals(cachedOptions, options)) {
        return cachedSQL
      }
      cachedOptions = options
      return toSQL(sqlString, options)
    }
  }
  return result
}
exports.sql = sql

/**
 * A clause is a template string which is left
 * empty if the value in the conditional evaluates to
 * empty. Only one clause is permitted per statement.
 *
 * @example
 * clause`WHERE ${whereClauses}`
 *
 * @param  {Array<string>} strings
 * @param  {any} value
 * @return {Object}
 */
function clause(strings, value) {
  invariant(
    arguments.length === 2,
    `
      clause may only be used with a single conditional clause,
      saw multiple values after %s
    `,
    value
  )
  return tag('clause', (options) => {
    const finalValue = toSQL(value, options)
    return finalValue.sql ? sql(strings, value) : {}
  })
}
exports.clause = clause

/**
 * Wraps an identifier
 * @param  {string} value
 * @return Object
 */
function ident(value) {
  invariant(
    typeof value === 'string',
    'Invalid value for ident, expected string, saw %s',
    value
  )
  if (value === '*') {
    return raw(value)
  }
  return tag('ident', ({escapeId}) => ({sql: escapeId(value)}))
}
exports.ident = ident

/**
 * Marks a value as a parameter, this is the default
 * function
 * @param  {[type]} value [description]
 * @return {[type]}       [description]
 */
function param(value) {
  return tag('param', ({timezone, withParameters, escape}) => {
    if (withParameters) {
      return {
        sql: '?',
        bindings: [value]
      }
    }
    return {sql: escape(value, timezone)}
  })
}
exports.param = param

function raw(value) {
  return tag('raw', () => ({
    sql: value === undefined ? '' : value + ''
  }))
}
exports.raw = raw

/**
 * Parameterize a list of columns
 *
 * @example
 * sql`SELECT * FROM users WHERE id IN ${parameterize(1, 2, 3)}`
 *
 * {
 *   sql: SELECT * FROM users WHERE id IN (?, ?, ?),
 *   bindings: [1, 2, 3]
 * }
 *
 * @param  {Array} values
 * @param  {string} separator
 * @return {Object}
 */
function parameterize(values, separator = ', ') {
  invariant(
    Array.isArray(values),
    'Parameterize accepts an array of values to parameterize, saw %s',
    values
  )
  return tag('parameterize', ({withParameters, escape}) => {
    const bindings = []
    let sql = ''
    let i = -1
    while (++i < values.length) {
      if (i > 0) sql += separator
      if (withParameters) {
        sql += '?'
        bindings.push(values[i])
      } else {
        sql += escape(values[i])
      }
    }
    return {sql, bindings}
  })
}
exports.parameterize = parameterize

/**
 * Convert an array of columns into a list of
 * identifiers. Useful in creating dynamic
 * parameterized statements.
 *
 * @example
 *  sql`
 *  INSERT INTO users (${columnize(['id', 'account', 'name'])})
 *    VALUES (${parameterize([1, 'test', 'user'])})
 *  `
 *
 * @param  {Array<string>} columns
 * @param  {Array} params
 * @return {Object}
 */
function columnize(columns, separator = ', ') {
  invariant(
    Array.isArray(columns),
    'Columnize accepts an array of values to columnize, saw %s',
    columns
  )
  return tag('columnize', ({escapeId}) => {
    let sql = ''
    let i = -1
    while (++i < columns.length) {
      if (i > 0) sql += separator
      sql += escapeId(columns[i])
    }
    return {sql}
  })
}
exports.columnize = columnize

/**
 * Tagged template helper, call the function
 * @param  {[type]}    strings [description]
 * @param  {...[type]} idents  [description]
 * @return {Function}          [description]
 */
function fn(strings, ...idents) {
  invariant(
    Array.isArray(strings),
    'fn may only be used as a template tag: fn`count(${a}, ${b})\n' +
    'or with similar syntax as a template tag: fn([\'count(\', \')\'], a, b)'
  )
  return sql(strings, ...idents.map(ident))
}
exports.fn = fn

/**
 * Helper function for splitting statements across multiple lines,
 * using
 * @param  {Array} values
 * @param  {string} separator
 * @return {Object}
 */
function lines(values, separator = `\n`) {
  return tag('lines', (options) => {
    let finalSql = separator
    let finalBindings = []
    for (let i = 0; i < values.length; i++) {
      const {sql, bindings} = toSQL(values[i], options)
      if (sql) {
        finalSql += sql
        if (i < values.length - 1) {
          finalSql += separator
        } else {
          finalSql += separator.replace(/ +/, '')
        }
      }
      finalBindings = finalBindings.concat(bindings)
    }
    return {
      sql: finalSql,
      bindings: finalBindings
    }
  })
}
exports.lines = lines
