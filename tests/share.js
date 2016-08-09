var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')

var Dat = require('..')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

var fixtures = path.join(__dirname, 'fixtures')
var stats = {
  filesTotal: 2,
  bytesTotal: 1441
}
var fixturesKey = '1c9a237203f6397442dfc3430e9e842a2a31ef81c14156a0a3cde83fd614578a'
var dat
var liveKey

test('prep', function (t) {
  cleanFixtures(function () {
    t.end()
  })
})

test('Share with default opts', function (t) {
  dat = Dat({dir: fixtures})
  var fileCount = 0

  dat.once('ready', function () {
    t.pass('emits ready')
    t.ok(dat.dir === fixtures, 'correct directory')
    fs.stat(path.join(fixtures, '.dat'), function (err, stat) {
      t.error(err)
      t.pass('creates .dat dir')
    })

    dat.share(function (err) {
      t.error(err, 'no sharing error')
      t.pass('share callback called')
      dat.close(function () {
        t.end()
      })
    })
  })

  dat.once('append-ready', function () {
    t.pass('append ready emits')
    t.ok(dat.stats.filesTotal > 0, 'append ready stats')
  })

  dat.once('key', function (key) {
    liveKey = key
    t.ok(key && key.length === 64, 'emits key')
  })

  dat.once('append-ready', function () {
    t.same(stats.filesTotal, dat.stats.filesTotal, 'total files')
    t.same(stats.bytesTotal, dat.stats.bytesTotal, 'total bytes')
  })

  dat.on('file-added', function () {
    fileCount++
  })

  dat.once('archive-finalized', function () {
    t.pass('emits archive-finalized')
    t.same(stats.filesTotal, fileCount, 'file-added emitted correct # times')
    t.same(dat.stats.filesProgress, stats.filesTotal, 'progress file count')
    t.same(dat.stats.bytesProgress, stats.bytesTotal, 'progress byte count')
  })
})

test('Share resume with .dat folder present', function (t) {
  dat = Dat({dir: fixtures})
  dat.once('ready', function () {
    dat.share(function (err) {
      t.error(err, 'share cb without error')
      t.ok(dat.resume, 'resume flag set')
      dat.close(cleanFixtures(function () {
        t.end()
      }))
    })
  })

  dat.once('key', function (key) {
    t.same(liveKey, key, 'key matches previous key')
  })

  dat.once('archive-finalized', function () {
    t.skip('TODO: check that files are skipped')
  })
})

test('share snapshot', function (t) {
  dat = Dat({dir: fixtures, snapshot: true})
  dat.once('ready', function () {
    dat.share(function (err) {
      t.error(err, 'share cb without error')
      t.ok(dat.snapshot, 'snapshot flag set')
      t.end()
    })
  })

  dat.once('key', function (key) {
    // TODO: check this when mtime bugs are fixed
    t.same(fixturesKey, key, 'TODO: key matches snapshot key')
  })
})

test.onFinish(function () {
  dat.close(cleanFixtures)
})

function cleanFixtures (cb) {
  if (!cb) cb = function () {}
  rimraf(path.join(fixtures, '.dat'), cb)
}
