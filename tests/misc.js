var path = require('path')
var test = require('tape')
var anymatch = require('anymatch')
var rimraf = require('rimraf')
var memdb = require('memdb')
var encoding = require('dat-encoding')
var fs = require('fs')
var os = require('os')

var Dat = require('..')
var shareFolder = path.join(__dirname, 'fixtures', 'folder')

test('default ignore', function (t) {
  var dat = Dat({ dir: process.cwd() })
  var matchers = dat.options.ignore

  t.ok(anymatch(matchers, '.dat'), '.dat folder ignored')
  t.ok(anymatch(matchers, '.dat/'), '.dat folder with slash ignored')
  t.ok(anymatch(matchers, '.dat/foo.bar'), 'files in .dat folder ignored')
  t.ok(anymatch(matchers, 'dir/.git'), 'hidden folders with dir ignored')
  t.ok(anymatch(matchers, 'dir/.git/test.txt'), 'files inside hidden dir with dir ignored')
  t.notOk(anymatch(matchers, 'folder/asdf.data/file.txt'), 'weird data folder is ok')
  t.notOk(
    ['file.dat', '.dat.jpg', '.dat-thing'].filter(anymatch(matchers)).length !== 0,
    'does not ignore files/folders with .dat in it')
  t.end()
})

test('custom ignore extends default (string)', function (t) {
  var dat = Dat({ ignore: '**/*.js', dir: process.cwd() })
  var matchers = dat.options.ignore

  t.ok(Array.isArray(dat.options.ignore), 'ignore extended correctly')
  t.ok(anymatch(matchers, '.dat'), '.dat folder ignored')
  t.ok(anymatch(matchers, 'foo/bar.js'), 'custom ignore works')
  t.notOk(anymatch(matchers, 'foo/bar.txt'), 'txt file gets to come along =)')
  t.end()
})

test('custom ignore extends default (array)', function (t) {
  var dat = Dat({ ignore: ['super_secret_stuff/*', '**/*.txt'], dir: process.cwd() })
  var matchers = dat.options.ignore

  t.ok(Array.isArray(dat.options.ignore), 'ignore extended correctly')
  t.ok(anymatch(matchers, '.dat'), '.dat still feeling left out =(')
  t.ok(anymatch(matchers, 'password.txt'), 'file ignored')
  t.ok(anymatch(matchers, 'super_secret_stuff/file.js'), 'secret stuff stays secret')
  t.notOk(anymatch(matchers, 'foo/bar.js'), 'js file joins the party =)')
  t.end()
})

test('custom db option', function (t) {
  var dat = Dat({db: memdb(), dir: process.cwd()})
  dat.open(function (err) {
    t.error(err)
    t.ok(dat.db.db instanceof require('memdown'), 'db is memdown')

    dat.close(function () {
      t.end()
    })
  })
})

test('snapshot option', function (t) {
  var dat = Dat({snapshot: true, dir: process.cwd()})
  dat.open(function (err) {
    t.error(err)
    t.ok(dat.options.snapshot, 'snapshot true')
    t.ok(!dat.live, 'dat not live')
    t.ok(!dat.archive.live, 'archive not live')
    t.ok(!dat.options.watchFiles, 'watch files false')

    dat.close(function () {
      dat.db.close(function () {
        rimraf(path.join(process.cwd(), '.dat'), function () {
          t.end()
        })
      })
    })
  })
})

test('swarm options', function (t) {
  var dat = Dat({utp: false, port: 1234, discovery: {upload: false}, dir: process.cwd()})
  dat.open(function (err) {
    t.error(err)
    dat.once('connecting', function () {
      var swarm = dat.swarm

      t.ok(!swarm._options.utp, 'utp discovery false')
      t.ok(!swarm._utp, 'No utp discovery')

      t.same(swarm.address().port, 1234, 'port on node swarm okay')

      t.ok(!swarm.uploading, 'Upload false set on swarm')

      dat.close(function () {
        dat.db.close(function () {
          rimraf(path.join(process.cwd(), '.dat'), function () {
            t.end()
          })
        })
      })
    })
    dat._joinSwarm()
  })
})

test('swarm options 3.2.x compat', function (t) {
  var dat = Dat({upload: false, dir: process.cwd()})
  dat.open(function (err) {
    t.error(err)
    dat.once('connecting', function () {
      var swarm = dat.swarm
      t.ok(!swarm.uploading, 'Upload false set on swarm')

      dat.close(function () {
        dat.db.close(function () {
          rimraf(path.join(process.cwd(), '.dat'), function () {
            t.end()
          })
        })
      })
    })
    dat._joinSwarm()
  })
})

test('string or buffer .key', function (t) {
  var buf = new Buffer(32)
  var dat = Dat({key: buf, dir: process.cwd()})
  dat.open(function (err) {
    t.error(err)
    t.deepEqual(dat.archive.key, buf)

    dat.close(function (err) {
      t.error(err)
      dat.db.close(function (err) {
        t.error(err)

        dat = Dat({key: encoding.encode(buf), dir: process.cwd()})
        dat.open(function (err) {
          t.error(err)
          t.deepEqual(dat.archive.key, buf)
          dat.close(function () {
            dat.db.close(function () {
              t.end()
            })
          })
        })
      })
    })
  })
})

test('leveldb open error', function (t) {
  var a = Dat({ dir: process.cwd() })
  var b = Dat({ dir: process.cwd() })
  a.open(function (err) {
    t.error(err)
    b.open(function (err) {
      t.ok(err)
      a.close(function () {
        a.db.close(function () {
          rimraf(path.join(process.cwd(), '.dat'), function () {
            t.end()
          })
        })
      })
    })
  })
})

test('expose .key', function (t) {
  var folder = path.join(__dirname, 'fixtures', 'folder')
  var key = new Buffer(32)
  var dat = Dat({ dir: process.cwd(), key: key, db: memdb() })
  t.deepEqual(dat.key, key)
  dat = Dat({ dir: folder, db: memdb() })
  dat.share(function (err) {
    t.error(err)
    t.notDeepEqual(dat.key, key)
    dat.close(function (err) {
      t.error(err)
      t.end()
    })
  })
})

test('expose .owner', function (t) {
  rimraf.sync(path.join(shareFolder, '.dat'))
  var downFolder = path.join(os.tmpdir(), 'dat-' + Math.random().toString(16).slice(2))
  fs.mkdirSync(downFolder)

  var shareDat = Dat({ dir: shareFolder, snapshot: true })
  shareDat.share(function (err) {
    t.error(err, 'dat shared')
    t.ok(shareDat.owner, 'is owner')

    var downDat = Dat({ dir: downFolder, key: shareDat.key })
    downDat.download(function (err) {
      t.error(err, 'dat downloaded')
      t.notOk(downDat.owner, 'not owner')

      shareDat.close(function (err) {
        t.error(err, 'share dat closed')
        downDat.close(function (err) {
          t.error(err, 'download dat closed')
          t.end()
        })
      })
    })
  })
})

test('expose stats.peers', function (t) {
  rimraf.sync(path.join(shareFolder, '.dat'))
  var downFolder = path.join(os.tmpdir(), 'dat-' + Math.random().toString(16).slice(2))
  fs.mkdirSync(downFolder)

  var shareDat = Dat({ dir: shareFolder, snapshot: true, db: memdb() })
  t.equal(shareDat.stats.peers, 0, '0 peers')

  shareDat.once('swarm-update', function () {
    t.ok(shareDat.stats.peers >= 1, '>=1 peer')
    t.end()
  })

  shareDat.share(function (err) {
    t.error(err, 'dat shared')

    var downDat = Dat({ dir: downFolder, key: shareDat.key })
    downDat.download(function (err) {
      t.error(err, 'dat downloaded')
      downDat.close(function (err) {
        t.error(err, 'download dat closed')
        shareDat.close(function (err) {
          t.error(err, 'share dat closed')
        })
      })
    })
  })
})
