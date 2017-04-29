var assert = require('assert')
// var Stats = require('hyperdrive-stats')
var networkSpeed = require('hyperdrive-network-speed')

module.exports = function (archive) {
  assert.ok(archive, 'lib/stats archive required')
  var stats = {}

  // TODO: hyperdrive-stats
  stats.get = function () {
    return {
      bytesTotal: archive.content.byteLength,
      blocksTotal: archive.content.length,
      filesTotal: archive.metadata.length
    }
  }
  stats.network = networkSpeed(archive, {timeout: 500})

  Object.defineProperties(stats, {
    peers: {
      enumerable: true,
      get: function () {
        if (!archive.content || !archive.content.peers) return {} // TODO: how to handle this?
        var peers = archive.content.peers
        var total = peers.length
        // TODO: Not in hypercore v5 yet
        // var downloadingFrom = peers.filter(function (peer) {
        //   return peer.downloaded
        // }).length
        var complete = peers.filter(function (peer) {
          return peer.remoteLength === archive.content.length
        }).length

        return {
          total: total,
          complete: complete
        }
      }
    }
  })

  return stats
}
