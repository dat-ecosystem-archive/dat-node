var path = require('path')
var test = require('tape')
var anymatch = require('anymatch')
var rimraf = require('rimraf')
var memdb = require('memdb')
var memdown = require('memdown')
var hyperdrive = require('hyperdrive')
var encoding = require('dat-encoding')
var fs = require('fs')
var os = require('os')
var mkdirp = require('mkdirp')

var Dat = require('..')
var shareFolder = path.join(__dirname, 'fixtures')

test('default ignore', function (t) {
  rimraf.sync(path.join(shareFolder, '.dat')) // for previous failed tests
  Dat(shareFolder, function (err, dat) {
    t.error(err)
    dat.importFiles(function () {
      var matchers = dat.importer.options.ignore

      t.ok(anymatch(matchers, '.dat'), '.dat folder ignored')
      t.ok(anymatch(matchers, '.dat/'), '.dat folder with slash ignored')
      t.ok(anymatch(matchers, '.dat/foo.bar'), 'files in .dat folder ignored')
      t.ok(anymatch(matchers, 'dir/.git'), 'hidden folders with dir ignored')
      t.ok(anymatch(matchers, 'dir/.git/test.txt'), 'files inside hidden dir with dir ignored')
      t.notOk(anymatch(matchers, 'folder/asdf.data/file.txt'), 'weird data folder is ok')
      t.notOk(
        ['file.dat', '.dat.jpg', '.dat-thing'].filter(anymatch(matchers)).length !== 0,
        'does not ignore files/folders with .dat in it')
      dat.close(function () {
        t.end()
      })
    })
  })
})

test('custom ignore extends default (string)', function (t) {
  Dat(shareFolder, function (err, dat) {
    t.error(err)
    dat.importFiles({ ignore: '**/*.js' }, function () {
      var matchers = dat.options.importer.ignore

      t.ok(Array.isArray(dat.options.importer.ignore), 'ignore extended correctly')
      t.ok(anymatch(matchers, '.dat'), '.dat folder ignored')
      t.ok(anymatch(matchers, 'foo/bar.js'), 'custom ignore works')
      t.notOk(anymatch(matchers, 'foo/bar.txt'), 'txt file gets to come along =)')
      dat.close(function () {
        t.end()
      })
    })
  })
})

test('custom ignore extends default (array)', function (t) {
  Dat(shareFolder, function (err, dat) {
    t.error(err)
    dat.importFiles({ ignore: ['super_secret_stuff/*', '**/*.txt'] }, function () {
      var matchers = dat.options.importer.ignore

      t.ok(Array.isArray(dat.options.importer.ignore), 'ignore extended correctly')
      t.ok(anymatch(matchers, '.dat'), '.dat still feeling left out =(')
      t.ok(anymatch(matchers, 'password.txt'), 'file ignored')
      t.ok(anymatch(matchers, 'super_secret_stuff/file.js'), 'secret stuff stays secret')
      t.notOk(anymatch(matchers, 'foo/bar.js'), 'js file joins the party =)')
      dat.close(function () {
        t.end()
      })
    })
  })
})

test('ignore hidden option turned off', function (t) {
  Dat(shareFolder, function (err, dat) {
    t.error(err)
    dat.importFiles({ ignoreHidden: false }, function () {
      var matchers = dat.options.importer.ignore

      t.ok(Array.isArray(dat.options.importer.ignore), 'ignore extended correctly')
      t.ok(anymatch(matchers, '.dat'), '.dat still feeling left out =(')
      t.notOk(anymatch(matchers, '.other-hidden'), 'hidden file NOT ignored')
      t.notOk(anymatch(matchers, 'dir/.git'), 'hidden folders with dir NOT ignored')
      dat.close(function () {
        t.end()
      })
    })
  })
})

test('custom db option', function (t) {
  rimraf.sync(path.join(shareFolder, '.dat'))
  Dat(shareFolder, {db: memdb()}, function (err, dat) {
    t.error(err)
    dat.archive.open(function () {
      // Need open otherwise get DeferredLevelDOWN
      t.ok(dat.db.db instanceof require('memdown'), 'db is memdown')
      try {
        fs.statSync(path.join(shareFolder, '.dat'))
        t.fail('.dat folder exists =(')
      } catch (e) {
        t.pass('.dat folder does not exist')
      }
      dat.close(function () {
        t.end()
      })
    })
  })
})

test('custom drive option', function (t) {
  rimraf.sync(path.join(shareFolder, '.dat'))
  var drive = hyperdrive(memdb())
  Dat(shareFolder, {drive: drive}, function (err, dat) {
    t.error(err)
    dat.archive.open(function () {
      // Need open otherwise get DeferredLevelDOWN
      t.ok(dat.db.db instanceof memdown, 'db is memdown')
      try {
        fs.statSync(path.join(shareFolder, '.dat'))
        t.fail('.dat folder exists =(')
      } catch (e) {
        t.pass('.dat folder does not exist')
      }
      dat.close(function () {
        t.end()
      })
    })
  })
})

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

test('string or buffer .key', function (t) {
  rimraf.sync(path.join(process.cwd(), '.dat')) // for failed tests
  var buf = new Buffer(32)
  Dat(process.cwd(), { key: buf }, function (err, dat) {
    t.error(err, 'no callback error')
    t.deepEqual(dat.archive.key, buf, 'keys match')

    dat.close(function (err) {
      t.error(err, 'no close error')

      Dat(process.cwd(), {key: encoding.encode(buf)}, function (err, dat) {
        t.error(err, 'no callback error')
        t.deepEqual(dat.archive.key, buf, 'keys match still')
        dat.close(function () {
          rimraf.sync(path.join(process.cwd(), '.dat'))
          t.end()
        })
      })
    })
  })
})

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

    var network = shareDat.joinNetwork()
    t.equal(network.connected, 0, '0 peers')

    network.once('connection', function () {
      t.ok(network.connected >= 1, '>=1 peer')

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

test('createIfMissing false', function (t) {
  rimraf.sync(path.join(shareFolder, '.dat'))
  Dat(shareFolder, {createIfMissing: false}, function (err, dat) {
    t.ok(err, 'throws error')
    t.end()
  })
})

test('backwards compat resume true', function (t) {
  rimraf.sync(path.join(shareFolder, '.dat'))
  Dat(shareFolder, {resume: true}, function (err, dat) {
    t.ok(err, 'throws error')
    t.end()
  })
})

test('errorIfExists true', function (t) {
  rimraf.sync(path.join(shareFolder, '.dat'))
  // create dat to resume from
  Dat(shareFolder, function (err, dat) {
    t.ifErr(err)
    dat.close(function () {
      Dat(shareFolder, {errorIfExists: true}, function (err, dat) {
        t.ok(err, 'throws error')
        t.end()
      })
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

test('create key and open with different key', function (t) {
  rimraf.sync(path.join(shareFolder, '.dat'))
  Dat(shareFolder, function (err, dat) {
    t.ifError(err)
    dat.close(function (err) {
      t.ifError(err)
      Dat(shareFolder, {key: '6161616161616161616161616161616161616161616161616161616161616161'}, function (err, dat) {
        t.same(err.message, 'Existing archive in database does not match key option.', 'has error')
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
