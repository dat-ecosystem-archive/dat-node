var assert = require('assert')
var Stats = require('hyperdrive-stats')
var sub = require('subleveldown')
var encoding = require('dat-encoding')

module.exports = function (archive, db) {
  assert.ok(archive, 'lib/stats archive required')
  assert.ok(db, 'lib/stats db required')

  return Stats({
    archive: archive,
    db: sub(db, `${encoding.encode(archive.key)}-stats`)
  })
}
