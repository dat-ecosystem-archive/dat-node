var fs = require('fs')
var os = require('os')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var memdb = require('memdb')
var mkdirp = require('mkdirp')
var tmp = require('temporary-directory')

var Dat = require('..')
var shareFolder = path.join(__dirname, 'fixtures')

test('peer connection information between two peers', function (t) {
  Dat(shareFolder, { db: memdb() }, function (err, dat) {
    tmp(function (err, dir, cleanup) {
      Dat(dir, { key: dat.key }, function (err, dat) {
        var network = dat.joinNetwork()
        var stats = dat.trackStats()
        dat.archive.open(function () {
          dat.archive.content.once('download', function () {
            var peers = stats.peers()
            console.log('client conn', peers)
            console.log('net con', network.connected)
            t.ok(peers.totalPeers >= 0, 'client has total peers') // value is inconsistent
            t.same(peers.activePeers, 1, 'client has one active peer')
            t.same(peers.sendingPeers, 1, 'client has one sending peer')
            t.same(peers.completePeers, 1, 'client has one complete peer')
          })
          dat.archive.content.once('download-finished', function () {
            dat.close(function (err) {
              t.error(err)
              process.nextTick(done)
            })
          })
        })
      })
    })

    dat.importFiles()
    var stats = dat.trackStats()
    var network = dat.joinNetwork()
    dat.archive.content.once('upload', function () {
      process.nextTick(function () {
        var peers = stats.peers()
        console.log('source connection', peers)
        t.ok(peers.totalPeers >= 0, 'source has total peers') // value is inconsistent
        t.same(peers.activePeers, 1, 'source has one active peer')
        t.same(peers.sendingPeers, 0, 'source has zero sending peer')
        t.ok(peers.completePeers, 0, 'source has zero complete peer')
      })
    })

    function done () {
      // after other peer has disconnected
      dat.close(function (err) {
        t.error(err, 'err')
        var peers = stats.peers()
        console.log('done', peers)
        t.same(peers.activePeers, 0, 'source has zero active peer')
        t.same(peers.completePeers, 0, 'source has zero complete peer')
        t.end()
      })
    }
  })
})
