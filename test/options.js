var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var memdb = require('memdb')
var memdown = require('memdown')
var hyperdrive = require('hyperdrive')
var encoding = require('dat-encoding')

var Dat = require('..')
var shareFolder = path.join(__dirname, 'fixtures')

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

test('custom drive as first arg', function (t) {
  var drive = hyperdrive(memdb())
  Dat(drive, {dir: shareFolder}, function (err, dat) {
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

test('custom drive as first arg without dir', function (t) {
  var drive = hyperdrive(memdb())
  Dat(drive, {}, function (err, dat) {
    t.ok(err, 'has error')
    rimraf.sync(path.join(shareFolder, '.dat'))
    t.end()
  })
})

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

test('createIfMissing false', function (t) {
  rimraf.sync(path.join(shareFolder, '.dat'))
  Dat(shareFolder, {createIfMissing: false}, function (err, dat) {
    t.ok(err, 'throws error')
    t.end()
  })
})

test('createIfMissing false with existing .dat', function (t) {
  rimraf.sync(path.join(shareFolder, '.dat'))
  fs.mkdirSync(path.join(shareFolder, '.dat'))
  Dat(shareFolder, {createIfMissing: false}, function (err, dat) {
    t.error(err, 'no error')
    t.ok(dat, 'creates dat')
    dat.close(function () {
      rimraf.sync(path.join(shareFolder, '.dat'))
      t.end()
    })
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
