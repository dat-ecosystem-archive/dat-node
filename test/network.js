var path = require('path')
var test = require('tape')
var memdb = require('memdb')
var tmp = require('temporary-directory')

var Dat = require('..')
var shareFolder = path.join(__dirname, 'fixtures')

test('peer connection information between two peers', function (t) {
  var srcDat
  var clientDat
  var clientClean

  Dat(shareFolder, { db: memdb() }, function (err, dat) {
    srcDat = dat
    t.error(err, 'no error')
    var sourceStats
    var clientStats

    tmp(function (err, dir, cleanup) {
      if (err) throw err
      Dat(dir, { key: dat.key }, function (err, dat) {
        clientDat = dat
        clientClean = cleanup
        t.error(err, 'no error')
        clientStats = clientDat.trackStats()

        beforeConnect(function () {
          var network = clientDat.joinNetwork()
          network.once('connection', function () {
            clientDat.archive.open(function () {
              onConnect(function () {
                clientDat.archive.content.once('download', onTransfer)
              })
            })
          })
        })
      })
    })

    sourceStats = srcDat.trackStats()
    srcDat.importFiles(function () {
      srcDat.joinNetwork()
      // srcDat.archive.content.once('upload', onTransfer)
    })

    function beforeConnect (cb) {
      var sPeers = sourceStats.peers()
      var cPeers = clientStats.peers()
      t.same(sPeers.totalPeers, 0, 'beforeConnect: source has zero total peers')
      t.same(sPeers.activePeers, 0, 'beforeConnect: source has zero active peer')
      t.same(sPeers.sendingPeers, 0, 'beforeConnect: source has zero sending peer')
      t.same(sPeers.completePeers, 0, 'beforeConnect: source has zero complete peer')
      t.notOk(cPeers.totalPeers, 'beforeConnect: client totalPeers undefined')
      cb()
    }

    function onConnect (cb) {
      var sPeers = sourceStats.peers()
      var cPeers = clientStats.peers()
      t.ok(sPeers.totalPeers >= 1, 'onConnect: source has 1 (or more) total peers')
      t.same(sPeers.activePeers, 0, 'onConnect: source has zero active peer')
      t.same(sPeers.sendingPeers, 0, 'onConnect: source has zero sending peer')
      t.same(sPeers.completePeers, 0, 'onConnect: source has zero complete peer')
      t.ok(cPeers.totalPeers >= 1, 'onConnect: client has 1 (or more) total peers')
      t.same(cPeers.activePeers, 0, 'onConnect: client has zero active peer')
      t.same(cPeers.sendingPeers, 0, 'onConnect: client has zero sending peer')
      t.ok(cPeers.completePeers >= 1, 'onConnect: client has >=1 complete peer')
      cb()
    }

    function onTransfer () {
      var sPeers = sourceStats.peers()
      var cPeers = clientStats.peers()
      // console.log(clientStats.get())
      // console.log(srcDat.archive.content.peers)
      t.ok(sPeers.totalPeers >= 1, 'onTransfer: source has 1 (or more) total peers')
      t.skip(sPeers.activePeers, 1, 'onTransfer: source has 1 active peer') // TODO: this seems 1 block behind, but we only have 1 block.
      t.same(sPeers.sendingPeers, 0, 'onTransfer: source has zero sending peer')
      t.same(sPeers.completePeers, 0, 'onTransfer: source has zero complete peer')
      t.ok(cPeers.totalPeers >= 1, 'onTransfer: client has 1 (or more) total peers')
      t.same(cPeers.activePeers, 1, 'onTransfer: client has 1 active peer')
      t.same(cPeers.sendingPeers, 1, 'onTransfer: client has 1 sending peer')
      t.ok(cPeers.completePeers >= 1, 'onTransfer: client has >=1 complete peer')

      // Check for completion
      var stats = clientStats.get()
      if (stats.blocksProgress === stats.blocksTotal) return next()
      clientStats.on('update', function () {
        var stats = clientStats.get()
        if (stats.blocksProgress === stats.blocksTotal) return next()
      })

      function next () {
        setTimeout(onComplete, 100) // download blocks take some time to clear
      }
    }

    function onComplete () {
      var sPeers = sourceStats.peers()
      var cPeers = clientStats.peers()
      t.ok(sPeers.totalPeers >= 1, 'onComplete: source has 1 (or more) total peers')
      t.same(sPeers.activePeers, 1, 'onComplete: source has 1 active peer')
      t.same(sPeers.sendingPeers, 0, 'onComplete: source has zero sending peer')
      t.same(sPeers.completePeers, 1, 'onComplete: source has 1 complete peer')
      t.ok(cPeers.totalPeers >= 1, 'onComplete: client has 1 (or more) total peers')
      t.same(cPeers.activePeers, 1, 'onComplete: client has 1 active peer')
      t.same(cPeers.sendingPeers, 1, 'onComplete: client has 1 sending peer')
      t.ok(cPeers.completePeers >= 1, 'onComplete: client has >=1 complete peer')
      onDisconnect()
    }

    function onDisconnect () {
      // disconnect peers
      clientDat.close(function () {
        var sPeers = sourceStats.peers()
        var cPeers = clientStats.peers()
        t.same(sPeers.activePeers, 0, 'onDisconnect: source has 0 active peer')
        t.same(sPeers.sendingPeers, 0, 'onDisconnect: source has zero sending peer')
        t.same(sPeers.completePeers, 0, 'onDisconnect: source has zero complete peer')
        t.same(cPeers.activePeers, 0, 'onDisconnect: client has 0 active peer')
        t.same(cPeers.sendingPeers, 0, 'onDisconnect: client has 0 sending peer')
        t.same(cPeers.completePeers, 0, 'onDisconnect: client has 0 complete peer')
        done()
      })
    }

    function done () {
      dat.close(function () {
        clientClean()
        t.end()
      })
    }
  })
})
