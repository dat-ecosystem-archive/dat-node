var assert = require('assert')
var Stats = require('hyperdrive-stats')
var sub = require('subleveldown')
var datKeyAs = require('dat-key-as')

module.exports = function (archive, db) {
  assert.ok(archive, 'lib/stats archive required')
  assert.ok(db, 'lib/stats db required')

  return Stats({
    archive: archive,
    db: sub(db, `${datKeyAs.str(archive.key)}-stats`)
  })
}
