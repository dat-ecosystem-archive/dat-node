var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var tmpDir = require('temporary-directory')

var Dat = require('..')
var fixtures = path.join(__dirname, 'fixtures')

test('misc: clean old test', function (t) {
  rimraf(path.join(fixtures, '.dat'), function () {
    t.end()
  })
})

test('misc: empty dat folder ok', function (t) {
  fs.mkdir(path.join(fixtures, '.dat'), function () {
    Dat(fixtures, function (err, dat) {
      t.error(err, 'no error')
      rimraf.sync(path.join(fixtures, '.dat'))
      t.end()
    })
  })
})

test('misc: existing invalid dat folder', function (t) {
  fs.mkdir(path.join(fixtures, '.dat'), function () {
    fs.writeFile(path.join(fixtures, '.dat', '0101.db'), '', function () {
      Dat(fixtures, function (err, dat) {
        t.ok(err, 'errors')
        rimraf.sync(path.join(fixtures, '.dat'))
        t.end()
      })
    })
  })
})

test('misc: non existing invalid dat path', function (t) {
  t.throws(function () {
    Dat('/non/existing/folder/', function () {})
  })
  t.end()
})

test('misc: open error', function (t) {
  t.skip('TODO: lock file')
  t.end()

  // Dat(process.cwd(), function (err, datA) {
  //   t.error(err)
  //   Dat(process.cwd(), function (err, datB) {
  //     t.ok(err, 'second open errors')
  //     datA.close(function () {
  //       rimraf(path.join(process.cwd(), '.dat'), function () {
  //         t.end()
  //       })
  //     })
  //   })
  // })
})

test('misc: expose .key', function (t) {
  var key = Buffer.alloc(32)
  Dat(process.cwd(), { key: key, temp: true }, function (err, dat) {
    t.error(err, 'error')
    t.deepEqual(dat.key, key)

    Dat(fixtures, { temp: true }, function (err, dat) {
      t.error(err, 'error')
      t.notDeepEqual(dat.key, key)
      dat.close(function (err) {
        t.error(err, 'error')
        t.end()
      })
    })
  })
})

test('misc: expose .writable', function (t) {
  tmpDir(function (err, downDir, cleanup) {
    t.error(err, 'error')
    Dat(fixtures, function (err, shareDat) {
      t.error(err, 'error')
      t.ok(shareDat.writable, 'is writable')
      shareDat.joinNetwork()

      Dat(downDir, { key: shareDat.key }, function (err, downDat) {
        t.error(err, 'error')
        t.notOk(downDat.writable, 'not writable')

        shareDat.close(function (err) {
          t.error(err, 'error')
          downDat.close(function (err) {
            t.error(err, 'error')
            cleanup(function (err) {
              rimraf.sync(path.join(fixtures, '.dat'))
              t.error(err, 'error')
              t.end()
            })
          })
        })
      })
    })
  })
})

test('misc: expose swarm.connections', function (t) {
  tmpDir(function (err, downDir, cleanup) {
    t.error(err, 'error')
    var downDat
    Dat(fixtures, { temp: true }, function (err, shareDat) {
      t.error(err, 'error')

      t.doesNotThrow(shareDat.leave, 'leave before join should be noop')

      var network = shareDat.joinNetwork()
      t.equal(network.connections.size, 0, '0 peers')

      network.once('connection', function () {
        t.ok(network.connections.size >= 1, '>=1 peer')
        shareDat.leave()
        t.skip(downDat.network.connections.size, 0, '0 peers') // TODO: Fix connection count
        downDat.close(function (err) {
          t.error(err, 'error')
          shareDat.close(function (err) {
            t.error(err, 'error')
            cleanup(function (err) {
              t.error(err, 'error')
              t.end()
            })
          })
        })
      })

      Dat(downDir, { key: shareDat.key, temp: true }, function (err, dat) {
        t.error(err, 'error')
        dat.joinNetwork()
        downDat = dat
      })
    })
  })
})

test('misc: close twice errors', function (t) {
  Dat(fixtures, { temp: true }, function (err, dat) {
    t.error(err, 'error')
    dat.close(function (err) {
      t.error(err, 'error')
      dat.close(function (err) {
        t.ok(err, 'has close error second time')
        t.end()
      })
    })
  })
})

test('misc: close twice sync errors', function (t) {
  Dat(fixtures, { temp: true }, function (err, dat) {
    t.error(err, 'error')
    dat.close(function (err) {
      t.error(err, 'error')
      t.end()
    })
    dat.close(function (err) {
      t.ok(err, 'has close error second time')
    })
  })
})

test('misc: create key and open with different key', function (t) {
  t.skip('TODO')
  t.end()
  // TODO: hyperdrive needs to forward hypercore metadta errors
  // https://github.com/mafintosh/hyperdrive/blob/master/index.js#L37

  // rimraf.sync(path.join(fixtures, '.dat'))
  // Dat(fixtures, function (err, dat) {
  //   t.error(err, 'error')
  //   dat.close(function (err) {
  //     t.error(err, 'error')
  //     Dat(fixtures, {key: '6161616161616161616161616161616161616161616161616161616161616161'}, function (err, dat) {
  //       t.same(err.message, 'Another hypercore is stored here', 'has error')
  //       rimraf.sync(path.join(fixtures, '.dat'))
  //       t.end()
  //     })
  //   })
  // })
})

test('misc: make dat with random key and open again', function (t) {
  tmpDir(function (err, downDir, cleanup) {
    t.error(err, 'error')
    var key = '6161616161616161616161616161616161616161616161616161616161616161'
    Dat(downDir, { key: key }, function (err, dat) {
      t.error(err, 'error')
      t.ok(dat, 'has dat')
      dat.close(function (err) {
        t.error(err, 'error')
        Dat(downDir, { key: key }, function (err, dat) {
          t.error(err, 'error')
          t.ok(dat, 'has dat')
          t.end()
        })
      })
    })
  })
})

test('misc: close order', function (t) {
  tmpDir(function (err, downDir, cleanup) {
    t.error(err, 'opened tmp dir')
    Dat(downDir, { watch: true }, function (err, dat) {
      t.error(err, 'dat properly opened')
      dat.importFiles(function (err) {
        t.error(err, 'started importing files')
        t.ok(dat.importer, 'importer exists')
        dat.joinNetwork({ dht: false }, function (err) {
          t.error(err, 'joined network')
          var order = []
          dat.network.on('error', function (err) {
            t.error(err)
          })
          dat.network.on('close', function () {
            order.push('network')
          })
          dat.importer.on('destroy', function () {
            order.push('importer')
          })
          dat.archive.metadata.on('close', function () {
            order.push('metadata')
          })
          dat.archive.content.on('close', function () {
            order.push('content')
            t.deepEquals(order, ['network', 'importer', 'metadata', 'content'], 'Close order as expected')
            t.end()
          })
          dat.close()
        })
      })
    })
  })
})
