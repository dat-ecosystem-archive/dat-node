var fs = require('fs')
var os = require('os')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var memdb = require('memdb')
var mkdirp = require('mkdirp')

var Dat = require('..')
var shareFolder = path.join(__dirname, 'fixtures')

// TODO: do we need these? All options are passed directly to swarm
// test('swarm options', function (t) {
//   var dat = Dat({utp: false, port: 1234, discovery: {upload: false}, dir: process.cwd()})
//   dat.open(function (err) {
//     t.error(err)
//     dat.once('connecting', function () {
//       var swarm = dat.swarm

//       t.ok(!swarm._options.utp, 'utp discovery false')
//       t.ok(!swarm._utp, 'No utp discovery')

//       t.same(swarm.address().port, 1234, 'port on node swarm okay')

//       t.ok(!swarm.uploading, 'Upload false set on swarm')

//       dat.close(function () {
//         dat.db.close(function () {
//           rimraf(path.join(process.cwd(), '.dat'), function () {
//             t.end()
//           })
//         })
//       })
//     })
//     dat._joinSwarm()
//   })
// })

test('leveldb open error', function (t) {
  Dat(process.cwd(), function (err, datA) {
    t.error(err)
    Dat(process.cwd(), function (err, datB) {
      t.ok(err)
      datA.close(function () {
        rimraf(path.join(process.cwd(), '.dat'), function () {
          t.end()
        })
      })
    })
  })
})

test('expose .key', function (t) {
  var folder = path.join(__dirname, 'fixtures')
  var key = new Buffer(32)
  Dat(process.cwd(), { key: key, db: memdb() }, function (err, dat) {
    t.error(err)
    t.deepEqual(dat.key, key)

    Dat(folder, { db: memdb() }, function (err, dat) {
      t.error(err)
      t.notDeepEqual(dat.key, key)
      dat.close(function (err) {
        t.error(err)
        rimraf.sync(path.join(folder, '.dat'))
        t.end()
      })
    })
  })
})

test('expose .owner', function (t) {
  rimraf.sync(path.join(shareFolder, '.dat'))
  var downFolder = path.join(os.tmpdir(), 'dat-' + Math.random().toString(16).slice(2))
  fs.mkdirSync(downFolder)

  Dat(shareFolder, function (err, shareDat) {
    t.error(err, 'dat shared')
    t.ok(shareDat.owner, 'is owner')
    shareDat.joinNetwork()

    Dat(downFolder, {key: shareDat.key}, function (err, downDat) {
      t.error(err, 'dat downloaded')
      t.notOk(downDat.owner, 'not owner')

      shareDat.close(function (err) {
        t.error(err, 'share dat closed')
        downDat.close(function (err) {
          t.error(err, 'download dat closed')
          rimraf.sync(downFolder)
          t.end()
        })
      })
    })
  })
})

test('expose swarm.connected', function (t) {
  rimraf.sync(path.join(shareFolder, '.dat'))
  var downDat
  var downFolder = path.join(os.tmpdir(), 'dat-' + Math.random().toString(16).slice(2))
  fs.mkdirSync(downFolder)

  Dat(shareFolder, { db: memdb() }, function (err, shareDat) {
    t.error(err, 'dat share err')

    t.doesNotThrow(shareDat.leave, 'leave before join should be noop')

    var network = shareDat.joinNetwork()
    t.equal(network.connected, 0, '0 peers')

    network.once('connection', function () {
      t.ok(network.connected >= 1, '>=1 peer')
      shareDat.leave()
      t.skip(downDat.network.connected, 0, '0 peers') // TODO: Fix connection count
      downDat.close(function (err) {
        t.error(err, 'download dat closed')
        shareDat.close(function (err) {
          t.error(err, 'share dat closed')
          t.end()
        })
      })
    })

    Dat(downFolder, { key: shareDat.key }, function (err, dat) {
      t.error(err, 'dat download err')
      dat.joinNetwork()
      downDat = dat
    })
  })
})

test('close twice errors', function (t) {
  Dat(shareFolder, function (err, dat) {
    t.ifError(err)
    dat.close(function (err) {
      t.ifError(err)
      dat.close(function (err) {
        t.ok(err, 'has close error second time')
        t.end()
      })
    })
  })
})

test('close twice sync errors', function (t) {
  Dat(shareFolder, function (err, dat) {
    t.ifError(err)
    dat.close(function (err) {
      t.ifError(err)
      rimraf.sync(path.join(shareFolder, '.dat'))
      t.end()
    })
    dat.close(function (err) {
      t.ok(err, 'has close error second time')
    })
  })
})

test('create key and open with different key', function (t) {
  rimraf.sync(path.join(shareFolder, '.dat'))
  Dat(shareFolder, function (err, dat) {
    t.ifError(err)
    dat.close(function (err) {
      t.ifError(err)
      Dat(shareFolder, {key: '6161616161616161616161616161616161616161616161616161616161616161'}, function (err, dat) {
        t.same(err.message, 'Existing archive in database does not match key option.', 'has error')
        rimraf.sync(path.join(shareFolder, '.dat'))
        t.end()
      })
    })
  })
})

test('make dat with random key and open again', function (t) {
  var downloadDir = path.join(os.tmpdir(), 'dat-download-tests-' + new Date().getTime())
  mkdirp.sync(downloadDir)
  var key = '6161616161616161616161616161616161616161616161616161616161616161'
  Dat(downloadDir, {key: key}, function (err, dat) {
    t.ifError(err)
    t.ok(dat, 'has dat')
    dat.close(function (err) {
      t.ifError(err)
      Dat(downloadDir, {key: key}, function (err, dat) {
        t.ifError(err)
        t.ok(dat, 'has dat')
        t.end()
      })
    })
  })
})
