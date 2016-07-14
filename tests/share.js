var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')

var Dat = require('..')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

var fixtures = path.join(__dirname, 'fixtures')
var dat

test('Share events with default opts', function (t) {
  dat = Dat({dir: fixtures})

  dat.once('ready', function () {
    t.pass('emits ready')
    t.ok(dat.dir === fixtures, 'correct directory')
    fs.stat(path.join(fixtures, '.dat'), function (err, stat) {
      if (err) return console.error(err)
      t.pass('creates .dat dir')
    })

    dat.share(function (err) {
      t.error(err, 'no sharing error')
      endTest(t)
    })
  })

  dat.once('append-ready', function () {
    t.pass('append ready emits')
    t.ok(dat.stats.filesTotal > 0, 'append ready stats')
  })

  dat.once('key', function (key) {
    t.ok(key && key.length === 50, 'emits key')
  })

  dat.once('archive-finalized', function () {
    t.pass('emits archive-finalized')
  })
})

test('Share stats', function (t) {
  dat = Dat({dir: fixtures})
  var stats = {
    filesTotal: 3,
    bytesTotal: 1543
  }

  dat.once('ready', function () {
    dat.share(function (err) {
      t.error(err, 'no share error')
      endTest(t)
    })
  })

  dat.once('append-ready', function () {
    t.same(stats.filesTotal, dat.stats.filesTotal, 'total files')
    t.same(stats.bytesTotal, dat.stats.bytesTotal, 'total bytes')
  })

  dat.once('archive-finalized', function () {
    t.same(dat.stats.filesProgress, stats.filesTotal, 'progress file count')
    t.same(dat.stats.bytesProgress, stats.bytesTotal, 'progress byte count')
  })
})

function endTest (t) {
  dat.db.close(function () {
    rimraf(path.join(dat.dir, '.dat'), function () {
      dat.close()
      t.end()
    })
  })
}
