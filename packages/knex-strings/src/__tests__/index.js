/* eslint-env mocha */
const expect = require('expect')
const dedent = require('dedent')

const {sql, toSQL, ident, fn, param, raw, parameterize, columnize, lines} = require('../../index')
const i = ident

describe('@knex/sql-strings', () => {

  describe('raw', () => {
    it('should tag a value with type "raw"', () => {
      expect(toSQL(raw`1`)).toInclude({
        sql: '1'
      })
    })
  })

  describe('ident', () => {
    it('should take a value and mark it as an ident', () => {
      expect(
        sql`${ident('users')}`.toString()
      ).toEqual('"users"')
    })
    it('should convert toSQL with the escapeId function', () => {
      expect(
        sql`${ident('users')}`.toString()
      ).toEqual('"users"')
      expect(
        sql`${ident('users.name')}`.toString()
      ).toEqual('"users"."name"')
      expect(
        sql`${ident('users.name')}`.toString({
          escapeId: val => '`' + val.replace(/`/g, '``').replace(/\./g, '`.`') + '`'
        })
      ).toEqual('`users`.`name`')
    })
  })

  describe('param', () => {
    it('should mark a value as a parameter', () => {
      expect(
        sql`WHERE name = ${param('user')}`.toSQL()
      ).toInclude({
        sql: 'WHERE name = ?',
        bindings: 'user'
      })
    })
  })

  describe('default interpolation', () => {
    it('should assume unmarked values are parameters', () => {
      const username = 'testuser'
      expect(
        sql`WHERE name = ${username}`.toSQL()
      ).toInclude({
        sql: 'WHERE name = ?',
        bindings: ['testuser']
      })
    })
    it('should assume unmarked values are parameters (toString)', () => {
      const username = 'testuser'
      expect(
        sql`WHERE name = ${username}`.toString()
      ).toEqual("WHERE name = 'testuser'")
    })
  })

  describe('parameterize', () => {
    it('should take an array of items and parameterize them', () => {
      expect(toSQL(
        sql`(${parameterize([1, 2, 3])})`
      )).toInclude({
        sql: '(?, ?, ?)',
        bindings: [1, 2, 3]
      })
    })
    it('should take a delimiter to format the parameterized object', () => {
      expect(toSQL(
        sql`(${parameterize([1, 2, 3], ',\n')})`
      )).toInclude({
        sql: `(?,\n?,\n?)`,
        bindings: [1, 2, 3]
      })
    })
    it('should toString an array of items and parameterize them', () => {
      expect(
        sql`(${parameterize([1, 2, 3])})`.toString()
      ).toEqual('(1, 2, 3)')
    })
    it('should toString a delimiter to format the parameterized object', () => {
      expect(
        sql`(${parameterize([1, 2, 3], ',\n')})`.toString()
      ).toEqual(`(1,\n2,\n3)`)
    })
  })

  describe('columnize', () => {
    it('should take an array of items and columnize them', () => {
      expect(sql`
        INSERT INTO users (
          ${columnize(['id', 'account', 'name'])}
        )
        VALUES (
          ${parameterize([1, 'test', 'user'])}
        )
      `.toSQL()
      ).toInclude({
        sql: dedent`
        INSERT INTO users (
          "id", "account", "name"
        )
        VALUES (
          ?, ?, ?
        )`,
        bindings: [1, 'test', 'user']
      })
    })
  })

  describe('fn', () => {
    it('should wrap functions', () => {
      const a = 'tbl'
      expect(
        fn`count(${a})` + ''
      ).toEqual(`count("tbl")`)
    })
  })

  describe('lines', () => {
    it('is a helper to procedurally split sql statements over multiple lines', () => {
      const statements = [
        sql`WHERE name = ${'account'}`,
        sql`AND id = ${2}`,
        sql`OR (${lines([sql`id = ${1}`, sql`AND id = ${2}`], '\n  ')})`
      ]
      expect(
        sql`${lines(statements)}` + ''
      ).toEqual(
        dedent`
        WHERE name = 'account'
        AND id = 2
        OR (
          id = 1
          AND id = 2
        )
        `
      )
    })
  })

  describe('sql', () => {
    it('should combine any sql-string value', () => {
      const tbl = 'nsp.tbl'
      const val1 = 'users'
      const val2 = 2
      expect(
        sql`SELECT * FROM ${i(tbl)} WHERE a = ${val1} AND b = ${val2}`.toSQL()
      ).toInclude({
        sql: 'SELECT * FROM "nsp"."tbl" WHERE a = ? AND b = ?',
        bindings: ['users', 2]
      })
    })
    it('should normalize indentation', () => {
      const id = 1
      const name = 'test'
      expect(
        sql`
          SELECT * FROM "accounts"
          WHERE id = ${id}
          AND name = ${name}
        `.toSQL()
      ).toInclude({
        sql: dedent`SELECT * FROM "accounts"
                    WHERE id = ?
                    AND name = ?`,
        bindings: [id, name]
      })
    })
    it('should handle nested sql fragments', () => {
      const accountId = 1
      const email = 'test@example.com'
      const subSelect = sql`SELECT user_id FROM accounts WHERE id = ${accountId}`
      const mainSelect = sql`
        SELECT users.* FROM users
        WHERE id IN (
          ${subSelect}
        )
        AND email = ${email}
      `
      expect(mainSelect.toSQL()).toInclude({
        sql: dedent`
          SELECT users.* FROM users
          WHERE id IN (
            SELECT user_id FROM accounts WHERE id = ?
          )
          AND email = ?
        `,
        bindings: [accountId, email]
      })
    })
  })
})
