var version = process.versions.node || '0.0.0'
var major = version.split('.')[0]

if (major >= 6) {
  module.exports = require('./src/sql-strings')
} else {
  module.exports = require('./lib/sql-strings')
}
