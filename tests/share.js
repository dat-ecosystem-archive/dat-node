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

  dat.open(function () {
    t.pass('open okay')
    t.ok(dat.dir === fixtures, 'correct directory')
    fs.stat(path.join(fixtures, '.dat'), function (err, stat) {
      t.error(err)
      t.pass('creates .dat dir')
    })

    dat.share(function (err) {
      t.error(err, 'no sharing error')
      t.pass('share callback called')
      dat.close(function () {
        dat.db.close(function () {
          t.end()
        })
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
  dat.share(function (err) {
    t.error(err, 'share cb without error')
    t.ok(dat.resume, 'resume flag set')
    dat.close(function () {
      dat.db.close(function () {
        cleanFixtures(function () {
          t.end()
        })
      })
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
  dat.share(function (err) {
    t.error(err, 'share cb without error')
    t.ok(!dat.live, 'live false')
    dat.close(cleanFixtures(function () {
      dat.db.close(function () {
        rimraf.sync(path.join(fixtures, '.dat'))
        t.end()
      })
    }))
  })

  dat.once('key', function (key) {
    // TODO: saving mtime breaks this
    t.skip(fixturesKey, key, 'TODO: key matches snapshot key')
  })
})

test('share live - editing file', function (t) {
  dat = Dat({dir: fixtures})
  dat.share(function () {
    fs.writeFileSync(path.join(fixtures, 'folder', 'empty.txt'), '')
    dat.once('archive-updated', function () {
      t.pass('archive update fires')
      t.same(dat.stats.filesTotal, stats.filesTotal, 'files total correct')
      dat.close(function () {
        dat.db.close(function () {
          t.end()
        })
      })
    })
    dat.on('file-added', function (file) {
      if (file.mode === 'updated') {
        t.ok(file.path.indexOf('empty.txt') > -1, 'correct file updated')
      }
    })
  })
})

test('share live - creating new file', function (t) {
  dat = Dat({dir: fixtures})
  var newFile = path.join(fixtures, 'new.txt')
  dat.on('file-added', function (file) {
    if (file.mode === 'created') {
      t.ok(file.path.indexOf(newFile) > -1, 'new file with created mode')
    } else if (file.path.indexOf('new.txt') > -1) {
      t.fail('wrong file mode: ' + file.mode)
      console.error(file)
    }
  })
  dat.share(function (err) {
    t.error(err, 'share ok')
    fs.writeFile(newFile, 'hello world', function (err) {
      if (err) throw err
      t.pass('file write ok')
    })
    dat.once('archive-updated', function () {
      t.pass('archive update fires')
      t.same(dat.stats.filesTotal, stats.filesTotal + 1, 'files total correct')
      fs.unlink(newFile, function () {
        dat.close(function () {
          t.end()
        })
      })
    })
  })
})

test('cleanup', function (t) {
  dat.close(cleanFixtures(function () {
    t.end()
  }))
})

function cleanFixtures (cb) {
  cb = cb || function () {}
  rimraf(path.join(fixtures, '.dat'), cb)
}
