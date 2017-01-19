var assert = require('assert')
var Stats = require('hyperdrive-stats')
var sub = require('subleveldown')
var encoding = require('dat-encoding')
var networkSpeed = require('hyperdrive-network-speed')

module.exports = function (archive, db) {
  assert.ok(archive, 'lib/stats archive required')
  assert.ok(db, 'lib/stats db required')

  var stats = Stats({
    archive: archive,
    db: sub(db, `${encoding.toStr(archive.key)}-stats`)
  })
  stats.network = networkSpeed(archive, {timeout: 2000})

  return stats
}
