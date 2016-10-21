var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var dat = require('..')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

var fixtures = path.join(__dirname, 'fixtures')
var stats = {
  filesTotal: 2,
  bytesTotal: 1441
}
var fixturesKey = '1c9a237203f6397442dfc3430e9e842a2a31ef81c14156a0a3cde83fd614578a'
var liveKey

test('prep', function (t) {
  cleanFixtures(function () {
    t.end()
  })
})

test('Share with default opts', function (t) {
  var fileCount = 0

  dat(fixtures, function (err, node) {
    t.error(err, 'no error')
    t.pass('open okay')
    t.ok(node.dir === fixtures, 'correct directory')
    fs.stat(path.join(fixtures, '.dat'), function (err, stat) {
      t.error(err)
      t.pass('creates .dat dir')
    })

    node.share(function (err) {
      t.error(err, 'no sharing error')
      t.pass('share callback called')
      node.close(function () {
        node.db.close(function () {
          t.end()
        })
      })
    })

    node.once('append-ready', function () {
      t.pass('append ready emits')
      t.ok(node.stats.filesTotal > 0, 'append ready stats')
    })

    node.once('key', function (key) {
      liveKey = key
      t.ok(key && key.length === 64, 'emits key')
    })

    node.once('append-ready', function () {
      t.same(stats.filesTotal, node.stats.filesTotal, 'total files')
      t.same(stats.bytesTotal, node.stats.bytesTotal, 'total bytes')
    })

    node.on('file-added', function () {
      fileCount++
    })

    node.once('archive-finalized', function () {
      t.pass('emits archive-finalized')
      t.same(stats.filesTotal, fileCount, 'file-added emitted correct # times')
      t.same(node.stats.filesProgress, stats.filesTotal, 'progress file count')
      t.same(node.stats.bytesProgress, stats.bytesTotal, 'progress byte count')
    })
  })
})

test('Share resume with .dat folder present', function (t) {
  dat(fixtures, function (err, node) {
    t.error(err, 'no init error')
    node.share(function (err) {
      t.error(err, 'share cb without error')
      t.ok(node.resume, 'resume flag set')
      node.close(function () {
        node.db.close(function () {
          cleanFixtures(function () {
            t.end()
          })
        })
      })
    })

    node.once('key', function (key) {
      t.same(liveKey, key, 'key matches previous key')
    })

    node.once('archive-finalized', function () {
      t.skip('TODO: check that files are skipped')
    })
  })
})

test('share snapshot', function (t) {
  dat(fixtures, {snapshot: true}, function (err, node) {
    t.error(err, 'no init error')
    node.share(function (err) {
      t.error(err, 'share cb without error')
      t.ok(!node.live, 'live false')
      node.close(cleanFixtures(function () {
        node.db.close(function () {
          rimraf.sync(path.join(fixtures, '.dat'))
          t.end()
        })
      }))
    })

    node.once('key', function (key) {
      // TODO: saving mtime breaks this
      t.skip(fixturesKey, key, 'TODO: key matches snapshot key')
    })
  })
})

test('share live - editing file', function (t) {
  dat(fixtures, function (err, node) {
    t.error(err, 'no error')
    node.share(function () {
      fs.writeFileSync(path.join(fixtures, 'folder', 'empty.txt'), '')
      node.once('archive-updated', function () {
        t.pass('archive update fires')
        t.same(node.stats.filesTotal, stats.filesTotal, 'files total correct')
        node.close(function () {
          node.db.close(function () {
            t.end()
          })
        })
      })
      node.on('file-added', function (file) {
        if (file.mode === 'updated') {
          t.ok(file.path.indexOf('empty.txt') > -1, 'correct file updated')
        }
      })
    })
  })
})

if (!process.env.TRAVIS) {
  test('share live - creating new file', function (t) {
    dat(fixtures, function (err, node) {
      t.error(err, 'no init error')
      var newFile = path.join(fixtures, 'new.txt')
      node.share(function (err) {
        t.error(err, 'share ok')
        fs.writeFile(newFile, 'hello world', function (err) {
          if (err) throw err
          t.pass('file write ok')
        })
        node.once('archive-updated', function () {
          t.pass('archive update fires')
          t.same(node.stats.filesTotal, stats.filesTotal + 1, 'files total correct')
          fs.unlink(newFile, function () {
            node.close(function () {
              node.db.close(function () {
                cleanFixtures(function () {
                  t.end()
                })
              })
            })
          })
        })
        node.on('file-added', function (file) {
          if (file.mode === 'created') {
            t.ok(file.path.indexOf(newFile) > -1, 'new file with created mode')
          } else if (file.path.indexOf('new.txt') > -1) {
            t.fail('wrong file mode: ' + file.mode)
          }
        })
      })
    })
  })
}

test('cleanup', function (t) {
  cleanFixtures(function () {
    t.end()
  })
})

function cleanFixtures (cb) {
  cb = cb || function () {}
  rimraf(path.join(fixtures, '.dat'), cb)
}
