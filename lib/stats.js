var assert = require('assert')
var Stats = require('hyperdrive-stats')
var sub = require('subleveldown')
var encoding = require('dat-encoding')
var networkSpeed = require('hyperdrive-network-speed')

module.exports = function (archive, db) {
  assert.ok(archive, 'lib/stats archive required')
  // assert.ok(db, 'lib/stats db required')
  var stats = {}
  stats.get = function () {
    return {
      bytesTotal: archive.content.byteLength,
      blocksTotal: archive.content.length,
      filesTotal: archive.metadata.length // TODO: deduplicate
    }
  }
  stats.on = function () { }

  // TODO - update hyperdrive-stats to be non-level
  // var stats = Stats({
  //   archive: archive,
  //   db: sub(db, `${encoding.toStr(archive.discoveryKey)}-stats`)
  // })

  // var stats = {}
  // stats.network = networkSpeed(archive, {timeout: 2000})

  // TODO - check new peers API
  // Object.defineProperties(stats, {
  //   peers: {
  //     enumerable: true,
  //     get: function () {
  //       if (!archive.content || !archive.content.peers) return {} // TODO: how to handle this?
  //       var peers = archive.content.peers
  //       var total = peers.length
  //       var downloadingFrom = peers.filter(function (peer) {
  //         return peer.downloaded
  //       }).length
  //       var complete = peers.filter(function (peer) {
  //         return peer.remoteLength === archive.content.blocks
  //       }).length

  //       return {
  //         total: total,
  //         downloadingFrom: downloadingFrom,
  //         complete: complete
  //       }
  //     }
  //   }
  // })

  return stats
}
