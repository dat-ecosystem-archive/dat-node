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
          var network = clientDat.joinNetwork({dht: false, tcp: false})
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
      srcDat.joinNetwork({dht: false, tcp: false})
    })

    function beforeConnect (cb) {
      var sPeers = sourceStats.peers
      var cPeers = clientStats.peers
      t.same(sPeers.total, 0, 'beforeConnect: source has zero total peers')
      t.same(sPeers.downloadingFrom, 0, 'beforeConnect: source has zero sending peer')
      t.same(sPeers.complete, 0, 'beforeConnect: source has zero complete peer')
      t.notOk(cPeers.total, 'beforeConnect: client total undefined')
      cb()
    }

    function onConnect (cb) {
      var sPeers = sourceStats.peers
      var cPeers = clientStats.peers
      t.ok(sPeers.total >= 1, 'onConnect: source has 1 (or more) total peers')
      t.same(sPeers.downloadingFrom, 0, 'onConnect: source has zero sending peer')
      t.same(sPeers.complete, 0, 'onConnect: source has zero complete peer')
      t.ok(cPeers.total >= 1, 'onConnect: client has 1 (or more) total peers')
      t.same(cPeers.downloadingFrom, 0, 'onConnect: client has zero sending peer')
      t.ok(cPeers.complete >= 1, 'onConnect: client has >=1 complete peer')
      cb()
    }

    function onTransfer () {
      var sPeers = sourceStats.peers
      var cPeers = clientStats.peers
      t.ok(sPeers.total >= 1, 'onTransfer: source has 1 (or more) total peers')
      t.same(sPeers.downloadingFrom, 0, 'onTransfer: source has zero sending peer')
      t.ok(cPeers.total >= 1, 'onTransfer: client has 1 (or more) total peers')
      t.same(cPeers.downloadingFrom, 1, 'onTransfer: client has 1 sending peer')
      t.ok(cPeers.complete >= 1, 'onTransfer: client has >=1 complete peer')

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
      var sPeers = sourceStats.peers
      var cPeers = clientStats.peers
      t.ok(sPeers.total >= 1, 'onComplete: source has 1 (or more) total peers')
      t.same(sPeers.downloadingFrom, 0, 'onComplete: source has zero sending peer')
      t.same(sPeers.complete, 1, 'onComplete: source has 1 complete peer')
      t.ok(cPeers.total >= 1, 'onComplete: client has 1 (or more) total peers')
      t.same(cPeers.downloadingFrom, 1, 'onComplete: client has 1 sending peer')
      t.ok(cPeers.complete >= 1, 'onComplete: client has >=1 complete peer')
      onDisconnect()
    }

    function onDisconnect () {
      // disconnect peers
      clientDat.close(function () {
        var sPeers = sourceStats.peers
        var cPeers = clientStats.peers
        t.same(sPeers.downloadingFrom, 0, 'onDisconnect: source has zero sending peer')
        t.same(sPeers.complete, 0, 'onDisconnect: source has zero complete peer')
        t.same(cPeers.downloadingFrom, 0, 'onDisconnect: client has 0 sending peer')
        t.same(cPeers.complete, 0, 'onDisconnect: client has 0 complete peer')
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

test('peer connection information between 3 peers', function (t) {
  var srcDat
  var clientDat
  var clientDat1
  var client1Clean
  var client2Clean

  Dat(shareFolder, { db: memdb() }, function (err, dat) {
    srcDat = dat
    t.error(err, 'no error')
    var sourceStats
    var clientStats

    tmp(function (err, dir, cleanup) {
      if (err) throw err
      Dat(dir, { key: dat.key }, function (err, dat) {
        clientDat1 = dat
        client1Clean = cleanup
        t.error(err, 'no error')
        dat.trackStats()
        dat.joinNetwork({dht: false, tcp: false})
      })
    })

    tmp(function (err, dir, cleanup) {
      if (err) throw err
      Dat(dir, { key: dat.key }, function (err, dat) {
        clientDat = dat
        client2Clean = cleanup
        t.error(err, 'no error')
        clientStats = clientDat.trackStats()

        beforeConnect(function () {
          var network = clientDat.joinNetwork({dht: false, tcp: false})
          network.once('connection', function () {
            clientDat.archive.open(function () {
              process.nextTick(function () {
                onConnect(function () {
                  clientDat.archive.content.once('download', onTransfer)
                })
              })
            })
          })
        })
      })
    })

    sourceStats = srcDat.trackStats()
    srcDat.importFiles(function () {
      srcDat.joinNetwork({dht: false, tcp: false})
    })

    function beforeConnect (cb) {
      var sPeers = sourceStats.peers
      var cPeers = clientStats.peers
      t.same(sPeers.total, 0, 'beforeConnect: source has zero total peers')
      t.same(sPeers.downloadingFrom, 0, 'beforeConnect: source has zero sending peer')
      t.same(sPeers.complete, 0, 'beforeConnect: source has zero complete peer')
      t.notOk(cPeers.total, 'beforeConnect: client total undefined')
      cb()
    }

    function onConnect (cb) {
      var sPeers = sourceStats.peers
      var cPeers = clientStats.peers
      t.ok(sPeers.total >= 1, 'onConnect: source has 1 (or more) total peers')
      t.same(sPeers.downloadingFrom, 0, 'onConnect: source has zero sending peer')
      t.same(sPeers.complete, 0, 'onConnect: source has zero complete peer')
      t.ok(cPeers.total >= 1, 'onConnect: client has 1 (or more) total peers')
      t.same(cPeers.downloadingFrom, 0, 'onConnect: client has zero sending peer')
      t.ok(cPeers.complete >= 1, 'onConnect: client has >=1 complete peer')
      cb()
    }

    function onTransfer () {
      var sPeers = sourceStats.peers
      var cPeers = clientStats.peers
      t.ok(sPeers.total >= 1, 'onTransfer: source has 1 (or more) total peers')
      t.same(sPeers.downloadingFrom, 0, 'onTransfer: source has zero sending peer')
      t.ok(cPeers.total >= 1, 'onTransfer: client has 1 (or more) total peers')
      t.same(cPeers.downloadingFrom, 1, 'onTransfer: client has 1 sending peer')
      t.ok(cPeers.complete >= 1, 'onTransfer: client has >=1 complete peer')

      // Check for completion
      var stats = clientStats.get()
      if (stats.blocksProgress === stats.blocksTotal) return next()
      clientStats.on('update', function () {
        var stats = clientStats.get()
        if (stats.blocksProgress === stats.blocksTotal) return next()
      })

      function next () {
        setTimeout(onComplete, 200) // download blocks take some time to clear
      }
    }

    function onComplete () {
      var sPeers = sourceStats.peers
      var cPeers = clientStats.peers
      t.ok(sPeers.total >= 1, 'onComplete: source has 1 (or more) total peers')
      t.same(sPeers.downloadingFrom, 0, 'onComplete: source has zero sending peer')
      t.same(sPeers.complete >= 1, 'onComplete: source has >=1 complete peer')
      t.ok(cPeers.total >= 1, 'onComplete: client has 1 (or more) total peers')
      t.ok(cPeers.downloadingFrom >= 1, 'onComplete: client has 1 sending peer')
      t.ok(cPeers.complete >= 1, 'onComplete: client has >=1 complete peer')
      onDisconnect()
    }

    function onDisconnect () {
      // disconnect peers
      clientDat1.close()
      clientDat.close(function () {
        var sPeers = sourceStats.peers
        var cPeers = clientStats.peers
        t.same(sPeers.downloadingFrom, 0, 'onDisconnect: source has zero sending peer')
        t.same(sPeers.complete, 0, 'onDisconnect: source has zero complete peer')
        t.same(cPeers.downloadingFrom, 0, 'onDisconnect: client has 0 sending peer')
        t.same(cPeers.complete, 0, 'onDisconnect: client has 0 complete peer')
        done()
      })
    }

    function done () {
      dat.close(function () {
        client1Clean()
        client2Clean()
        t.end()
      })
    }
  })
})
