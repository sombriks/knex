# Knex: 1.0 WIP

This Branch is a WIP reorganization of the project, making more consistent documented internal APIs, and spliting up the project using [lerna](https://lernajs.io/). Please refer to the main master branch as nothing here is set in stone and a lot of things will probably be some breaking of thins over the coming month or two. Don't worry though - the goal is to have this branch run against the current test suite before it's used as the new master and put out as an RC for 1.0.

## (Proposed) Project Modules

### @knex/strings

This module will be the backbone for the library, and provide a standard means for composing SQL strings from smaller fragments. It utilizes ES6 [tagged template strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) to build more powerful statements than are currently supported with `knex.raw`

### @knex/builder

The Builder class is the well known chaning syntax for dynamically building query strings. It will be extended by the individual language dialect modules, and also modified by the adapter class to add async functionality.

### @knex/builder-mssql
### @knex/builder-mysql
### @knex/builder-orcale
### @knex/builder-postgresql
### @knex/builder-sqlite

### @knex/adapter

The adapter will be a generic interface used to add all of the functionality that makes knex useful beyond query building (transactions, pool, etc.). This module will be consumed by the following library specific adapter libraries:

### @knex/adapter-mssql
### @knex/adapter-mysql
### @knex/adapter-mysql2
### @knex/adapter-mariasql
### @knex/adapter-pg
### @knex/adapter-oracle
### @knex/adapter-oracledb
### @knex/adapter-sqlite3
### @knex/adapter-strong-oracle
### @knex/adapter-websql

### @knex/ddl

The ddl module will function similar to the builder, but provide common utilities for dealing with DDL statements used in migrations.

### @knex/ddl-mssql
### @knex/ddl-mysql
### @knex/ddl-orcale
### @knex/ddl-postgresql
### @knex/ddl-sqlite

Additional util modules:

### @knex/exceptions
### @knex/seed
### @knex/migrate
### @knex/cli
### @knex/coroutine (see generator notes below:)

## Other Notes:

Generators (not async/await until this is a standard) will be used internally in many cases where multiple queries need to be run over time. Generators are simple to test and are fully supported in Node 6.

knex.createContext() (naming subject to change) will be created to get a knex instance which will automatically use the same connection, useful for a request/response cycle.

knex.transaction() may be called without a function, to make transactions more portable and cheaper to use. It will build off of the context feature mentioned above.

Events will continue to be supported, but will be deprecated for 2.0 in favor of more explicit hooks, instrumentation, and observables.

Exceptions: Should be standardized throughout the library, looking at using https://www.python.org/dev/peps/pep-0249/#exceptions as a guide

... More notes to come

## Additional Main TODOs before 1.0

- [ ] Make it simpler to provide ssl credentials via query string / make SSL connections more straight-forward in general
- [ ] True prepared statements
- [ ] Better testing / way to test in client applications
- [ ] More consistent ways to handle connection failure
- [ ] Generate documentation from markdown
