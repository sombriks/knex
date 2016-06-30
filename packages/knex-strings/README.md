# @knex/strings

The `@knex/strings` module provides helpers to aid in constructing 
dynamic SQL by hand.

By using ES6 string literals, we can quickly build dynamic queries,
while still maintaining the ability to prepare / sanitize values.

## Example:

```js
import { sql, table as t, column as c, raw as r} from '@knex/template-strings'
const userId = 1
const values = [1, 2, 3]

sql`
select * from ${t('accounts')}
  where ${c('id')} = ${userId}
  or ${c('id')} in (parameterize(values))
`.toString()

// outputs:

// sql:
select * from `accounts`
  where `id` = 1
  or `other_id` in (1, 2, 3)

// ---

sql`
select * from ${t('accounts')}
  where ${c('id')} = ${p(userId)}
  or ${c('id')} in (list(values))
`.toSQL()

// outputs:

// sql:
select * from `accounts`
  where `id` = ?
  or `other_id` in (?, ?, ?)

// bindings:
[userId, ...values]

```
