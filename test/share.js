var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')

var Dat = require('..')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

var fixtures = path.join(__dirname, 'fixtures')
var fixtureStats = {
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

test('create dat with default ops', function (t) {
  Dat(fixtures, function (err, dat) {
    t.error(err, 'cb err okay')
    t.ok(dat.path === fixtures, 'correct directory')
    t.ok(dat.archive, 'has archive')
    t.ok(dat.db, 'has db')
    t.ok(dat.key, 'has key')
    t.ok(dat.live, 'is live')
    t.ok(dat.owner, 'is owner')
    t.ok(!dat.resumed, 'is not resumed')

    fs.stat(path.join(fixtures, '.dat'), function (err, stat) {
      t.error(err)
      t.pass('creates .dat dir')

      liveKey = dat.key
      var stats = dat.trackStats()
      var network = dat.joinNetwork()

      stats.once('update', function () {
        t.pass('stats update triggers')
      })

      network.once('listening', function () {
        t.pass('network listening')
      })

      dat.importFiles(function (err) {
        t.error(err, 'file import err okay')
        var st = stats.get()
        dat.archive.list({live: false}, function (err, list) {
          t.error(err, 'archive list err')
          var filesAndDir = fixtureStats.filesTotal + 2 // base dir + folder
          t.same(filesAndDir, list.length, 'total items in list ok')

          var hasTable = list.filter(function (item) {
            return item.name.indexOf('table.csv') > -1
          })
          var hasEmpty = list.filter(function (item) {
            return item.name.indexOf('empty.txt') > -1
          })
          t.ok(hasTable.length, 'table.csv in archive list')
          t.ok(hasEmpty.length, 'empty.txt in archive list')

          var bytesTotal = 0
          list.map(function (item) {
            bytesTotal += item.length
          })
          t.same(bytesTotal, fixtureStats.bytesTotal, 'bytes total via list ok')
          t.skip(st.bytesTotal, fixtureStats.bytesTotal, 'bytes total via stats ok') // TODO: hyperdrive-stats bug?
          t.skip(st.filesTotal, fixtureStats.filesTotal, 'TODO: files total ok') // empty.txt not showing up?
          dat.close(function () {
            t.end()
          })
        })
      })
    })
  })
})

test('Resume with .dat folder', function (t) {
  Dat(fixtures, function (err, dat) {
    t.error(err, 'cb without error')
    t.ok(dat.resumed, 'resume flag set')
    t.same(liveKey, dat.key, 'key matches previous key')

    var stats = dat.trackStats()

    dat.importFiles(function (err) {
      t.error(err, 'import files without err')

      var st = stats.get()
      t.same(st.bytesTotal, fixtureStats.bytesTotal, 'bytes total still the same')

      dat.close(function () {
        cleanFixtures(function () {
          t.end()
        })
      })
    })
  })
})

test('share snapshot', function (t) {
  Dat(fixtures, { live: false }, function (err, dat) {
    t.error(err, 'share cb without error')

    t.ok(!dat.live, 'live false')
    dat.importFiles(function (err) {
      t.error(err, 'no error')
      dat.archive.finalize(function (err) {
        t.error(err, 'no error')

        // TODO: saving mtime breaks this
        t.skip(fixturesKey, dat.key, 'TODO: key matches snapshot key')

        dat.close(cleanFixtures(function () {
          rimraf.sync(path.join(fixtures, '.dat'))
          t.end()
        }))
      })
    })
  })
})

if (!process.env.TRAVIS) {
  test('share live - editing file', function (t) {
    Dat(fixtures, function (err, dat) {
      t.error(err, 'a okay')
      var stats = dat.trackStats()

      var importer = dat.importFiles({ live: true }, function () {
        t.pass('initial import finishes')
        fs.writeFileSync(path.join(fixtures, 'folder', 'empty.txt'), '')
        t.skip(stats.get().filesTotal, fixtureStats.filesTotal, 'TODO: files total correct')
      })

      importer.on('file imported', function (file) {
        if (file.mode === 'updated') {
          t.ok(file.path.indexOf('empty.txt') > -1, 'correct file updated')

          dat.close(function () {
            t.end()
          })
        }
      })
    })
  })
}

if (!process.env.TRAVIS) {
  test('share live resume & create new file', function (t) {
    var newFile = path.join(fixtures, 'new.txt')
    Dat(fixtures, function (err, dat) {
      t.error(err, 'create ok')
      t.ok(dat.resumed, 'was resumed')

      var stats = dat.trackStats()

      // should already have old files, resume
      var importer = dat.importFiles({ live: true, resume: true }, function () {
        fs.writeFile(newFile, 'hello world', function (err) {
          if (err) throw err
        })
      })

      importer.on('file imported', function (file) {
        if (file.mode === 'created') {
          if (file.path.indexOf('new.txt') === -1) return t.fail('wrong file: ' + file.path)

          t.skip(stats.get().filesTotal, fixtureStats.filesTotal + 1, 'TODO: files total correct')
          t.ok(file.path.indexOf(newFile) > -1, 'new file with created mode')
          fs.unlink(newFile, function () {
            dat.close(function () {
              t.end()
            })
          })
        } else if (file.path.indexOf('new.txt') > -1) {
          console.error(file)
        }
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
