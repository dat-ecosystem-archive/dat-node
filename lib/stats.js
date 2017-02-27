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
    if (!archive.content || !archive.content.peers) return {} // TODO: how to handle this?
    var peers = archive.content.peers
    var totalPeers = peers.length
    var activePeers = peers.filter(function (peer) {
      return peer.remoteLength
    }).length
    var sendingPeers = peers.filter(function (peer) {
      return peer.downloaded
    }).length
    var completePeers = peers.filter(function (peer) {
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
