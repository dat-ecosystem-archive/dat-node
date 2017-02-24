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
  stats.peers = peers

  return stats

  function peers () {
    if (!archive.content.peers) return // how to handle this?
    var totalPeers = archive.content.peers.length
    var activePeers = archive.content.peers.filter(function (peer) {
      return peer.remoteLength
    }).length
    var sendingPeers = archive.content.peers.filter(function (peer) {
      return peer.downloaded
    }).length
    var completePeers = archive.content.peers.filter(function (peer) {
      return peer.remoteLength === archive.content.blocks
    }).length

    return {
      totalPeers: totalPeers,
      activePeers: activePeers,
      sendingPeers: sendingPeers,
      completePeers: completePeers
    }
  }
}
