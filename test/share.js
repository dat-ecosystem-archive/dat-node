var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var ram = require('random-access-memory')
var countFiles = require('count-files')
var helpers = require('./helpers')

var Dat = require('..')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

var fixtures = path.join(__dirname, 'fixtures')
var fixtureStats = {
  files: 2,
  bytes: 1441,
  dirs: 1
}
var liveKey

test('share: prep', function (t) {
  cleanFixtures(function () {
    t.end()
  })
})

test('share: create dat with default ops', function (t) {
  Dat(fixtures, function (err, dat) {
    t.error(err, 'cb err okay')
    t.ok(dat.path === fixtures, 'correct directory')
    t.ok(dat.archive, 'has archive')
    t.ok(dat.key, 'has key')
    t.ok(dat.live, 'is live')
    t.ok(dat.writable, 'is writable')
    t.ok(!dat.resumed, 'is not resumed')

    fs.stat(path.join(fixtures, '.dat'), function (err, stat) {
      t.error(err)
      t.pass('creates .dat dir')
    })

    liveKey = dat.key
    var putFiles = 0
    var stats = dat.trackStats()
    var network = dat.joinNetwork()

    // TODO: stats tests
    // stats.once('update', function () {
    //   t.pass('stats update triggers')
    // })

    network.once('listening', function () {
      t.pass('network listening')
    })

    var progress = dat.importFiles(function (err) {
      t.error(err, 'file import err okay')
      var archive = dat.archive
      var st = stats.get()

      // TODO: stat tests
      t.skip(st.files, 'TODO')

      t.same(putFiles, 4, '4 importer puts')
      t.same(archive.version, 4, '4th archive version')
      t.same(archive.metadata.length, 5, '5 entries in metadata')

      helpers.verifyFixtures(t, archive, function (err) {
        t.ifError(err)
        dat.close(function (err) {
          t.ifError(err)
          t.pass('close okay')
          t.end()
        })
      })
    })

    progress.on('put', function () {
      putFiles++
    })
  })
})

test('share: resume with .dat folder', function (t) {
  Dat(fixtures, function (err, dat) {
    t.error(err, 'cb without error')
    t.ok(dat.writable, 'dat still writable')
    t.ok(dat.resumed, 'resume flag set')
    t.same(liveKey, dat.key, 'key matches previous key')

    countFiles({fs: dat.archive, name: '/'}, function (err, count) {
      t.ifError(err, 'count err')
      var archive = dat.archive

      t.same(archive.version, 4, '4th archive version still')

      var st = dat.trackStats().get()
      t.skip(st.bytesTotal, fixtureStats.bytes, 'bytes total still the same')

      t.same(count.bytes, fixtureStats.bytes, 'bytes still ok')
      t.same(count.files, fixtureStats.files, 'bytes still ok')
      dat.close(function () {
        cleanFixtures(function () {
          t.end()
        })
      })
    })
  })
})

// TODO: live = false, not implemented yet in hyperdrive v8
// test('share snapshot', function (t) {
//   Dat(fixtures, { live: false }, function (err, dat) {
//     t.error(err, 'share cb without error')

//     t.ok(!dat.live, 'live false')
//     dat.importFiles(function (err) {
//       t.error(err, 'no error')
//       dat.archive.finalize(function (err) {
//         t.error(err, 'no error')

//         // TODO: saving mtime breaks this
//         // t.skip(fixturesKey, dat.key, 'TODO: key matches snapshot key')

//         dat.close(cleanFixtures(function () {
//           rimraf.sync(path.join(fixtures, '.dat'))
//           t.end()
//         }))
//       })
//     })
//   })
// })

if (!process.env.TRAVIS) {
  test('share: live - editing file', function (t) {
    Dat(fixtures, function (err, dat) {
      t.ifError(err, 'error')

      var importer = dat.importFiles({ watch: true }, function (err) {
        t.ifError(err, 'error')
        if (!err) t.fail('live import should not cb')
      })
      importer.on('put-end', function (src) {
        if (src.name.indexOf('empty.txt') > -1) {
          if (src.live) return done()
          fs.writeFileSync(path.join(fixtures, 'folder', 'empty.txt'), 'not empty')
        }
      })

      function done () {
        dat.archive.stat('/folder/empty.txt', function (err, stat) {
          t.ifError(err, 'error')
          t.same(stat.size, 9, 'empty file has new content')
          dat.close(function () {
            // make file empty again
            fs.writeFileSync(path.join(fixtures, 'folder', 'empty.txt'), '')
            t.end()
          })
        })
      }
    })
  })

  test('share: live resume & create new file', function (t) {
    var newFile = path.join(fixtures, 'new.txt')
    Dat(fixtures, function (err, dat) {
      t.error(err, 'error')
      t.ok(dat.resumed, 'was resumed')

      var importer = dat.importFiles({ watch: true }, function (err) {
        t.error(err, 'error')
        if (!err) t.fail('watch import should not cb')
      })

      importer.on('put-end', function (src) {
        if (src.name.indexOf('new.txt') === -1) return
        t.ok(src.live, 'file put is live')
        process.nextTick(done)
      })

      fs.writeFile(newFile, 'hello world', function (err) {
        t.ifError(err, 'error')
      })

      function done () {
        dat.archive.stat('/new.txt', function (err, stat) {
          t.ifError(err, 'error')
          t.ok(stat, 'new file in archive')
          fs.unlink(newFile, function () {
            dat.close(function () {
              t.end()
            })
          })
        })
      }
    })
  })
}

test('share: cleanup', function (t) {
  cleanFixtures(function () {
    t.end()
  })
})

test('share: dir storage and opts.temp', function (t) {
  Dat(fixtures, {temp: true}, function (err, dat) {
    t.error(err, 'error')

    dat.importFiles(function (err) {
      t.error(err, 'error')
      helpers.verifyFixtures(t, dat.archive, done)
    })

    function done (err) {
      t.error(err, 'error')
      dat.close(function () {
        t.end()
      })
    }
  })
})

test('share: ram storage & import other dir', function (t) {
  Dat(ram, function (err, dat) {
    t.error(err, 'error')

    dat.importFiles(fixtures, function (err) {
      t.error(err, 'error')
      helpers.verifyFixtures(t, dat.archive, done)
    })

    function done (err) {
      t.error(err, 'error')
      dat.close(function () {
        t.end()
      })
    }
  })
})

function cleanFixtures (cb) {
  cb = cb || function () {}
  rimraf(path.join(fixtures, '.dat'), cb)
}
