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
    db: sub(db, `${encoding.toStr(archive.discoveryKey)}-stats`)
  })
  stats.network = networkSpeed(archive, {timeout: 2000})

  Object.defineProperties(stats, {
    peers: {
      enumerable: true,
      get: function () {
        if (!archive.content || !archive.content.peers) return {} // TODO: how to handle this?
        var peers = archive.content.peers
        var total = peers.length
        var downloadingFrom = peers.filter(function (peer) {
          return peer.downloaded
        }).length
        var complete = peers.filter(function (peer) {
          return peer.remoteLength === archive.content.blocks
        }).length

        return {
          total: total,
          downloadingFrom: downloadingFrom,
          complete: complete
        }
      }
    }
  })

  return stats
}
