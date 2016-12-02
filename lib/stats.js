var assert = require('assert')
var Stats = require('hyperdrive-stats')
var sub = require('subleveldown')
var datKeyAs = require('dat-key-as')
var networkSpeed = require('hyperdrive-network-speed')

module.exports = function (archive, db) {
  assert.ok(archive, 'lib/stats archive required')
  assert.ok(db, 'lib/stats db required')

  var stats = Stats({
    archive: archive,
    db: sub(db, `${datKeyAs.str(archive.key)}-stats`)
  })
  stats.network = networkSpeed(archive, {timeout: 1000})

  return stats
}
