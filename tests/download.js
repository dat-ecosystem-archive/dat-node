var fs = require('fs')
var path = require('path')
var os = require('os')
var test = require('tape')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')

var Dat = require('..')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

var downloadDat
var downloadDir
var shareDat
var shareKey
var fixtures = path.join(__dirname, 'fixtures')
var fixtureStats = {
  filesTotal: 2, // table.csv, empty.txt
  bytesTotal: 1441
}

test('prep', function (t) {
  rimraf.sync(path.join(fixtures, '.dat')) // for previous failed tests
  Dat(fixtures, {}, function (err, dat) {
    t.error(err, 'share error okay')
    shareKey = dat.key
    shareDat = dat
    dat.joinNetwork()
    dat.importFiles({ live: true }, function () { // need live for live download tests!
      testFolder(function () {
        t.end()
      })
    })
  })
})

test('Download with default opts', function (t) {
  Dat(downloadDir, {key: shareKey}, function (err, dat) {
    t.error(err, 'no download init error')
    t.ok(dat, 'callsback with dat object')
    t.ok(dat.key, 'has key')
    t.ok(dat.archive, 'has archive')
    t.ok(dat.db, 'has db')
    t.ok(dat.owner === false, 'archive not owned')

    var archive = dat.archive
    downloadDat = dat

    archive.open(function () {
      // Network needs to connect for archive.open to callback
      archive.content.once('download-finished', function () {
        t.pass('archive.content emits download-finished')
        setTimeout(done, 500) // issue w/ download-finished firing before stats updated
      })
    })

    var stats = dat.trackStats()
    stats.once('update', function () {
      t.pass('stats emit update')
    })

    var network = dat.joinNetwork()
    network.once('connection', function () {
      t.pass('connects via network')
    })

    function done () {
      var st = stats.get()
      t.same(st.filesTotal, fixtureStats.filesTotal, 'files total match')
      t.same(st.bytesTotal, fixtureStats.bytesTotal, 'bytes total match')
      t.skip(st.blocksProgress, st.blocksTotal, 'TODO: blocks total matches progress')
      t.skip(st.filesProgress, st.filesTotal, 'TODO: file total matches progress')
      fs.readdir(downloadDir, function (_, files) {
        var hasCsvFile = files.indexOf('table.csv') > -1
        var hasDatFolder = files.indexOf('.dat') > -1
        t.ok(hasDatFolder, '.dat folder created')
        t.ok(hasCsvFile, 'csv file downloaded')

        if (files.indexOf('folder') > -1) {
          var subFiles = fs.readdirSync(path.join(downloadDir, 'folder'))
          var hasEmtpy = subFiles.indexOf('empty.txt') > -1
          t.skip(hasEmtpy, 'empty.txt file downloaded')
          // TODO: known hyperdrive issue https://github.com/mafintosh/hyperdrive/issues/83
        }
        t.end()
      })
    }
  })
})

if (!process.env.TRAVIS) {
  test('download and live update (new file)', function (t) {
    var dat = downloadDat // use previous test download
    var archive = dat.archive
    var newFile = path.join(fixtures, 'new.txt')

    archive.metadata.on('update', function () {
      t.pass('metadata update fires')
    })

    archive.on('download-finished', function () {
      t.skip('TODO: download finished fires again')
    })

    dat.stats.once('update:filesTotal', function () {
      t.same(dat.stats.get().filesTotal, fixtureStats.filesTotal + 1, 'filesTotal has one more')
    })

    dat.stats.on('update:blocksProgress', function () {
      var st = dat.stats.get()
      if (st.blocksTotal && st.blocksProgress === st.blocksTotal) return done()
    })

    addShareFile()

    function addShareFile () {
      fs.writeFileSync(newFile, 'helloooooo')
    }

    function done () {
      // shareDat file watching is closing without callback and causing trouble
      dat.close(function () {
        fs.unlink(newFile, function () {
          t.end()
        })
      })
    }
  })
}

if (process.env.TRAVIS) {
  // This is closed in previous test, but travis skips that because of the live stuff
  test('close previous download', function (t) {
    downloadDat.close(function (err) {
      t.error(err)
      t.end()
    })
  })
}

test('close first test', function (t) {
  shareDat.close(function (err) {
    t.error(err, 'no close error')
    t.pass('close')
    rimraf.sync(path.join(fixtures, '.dat'))
    t.end()
  })
})

test('download from snapshot', function (t) {
  var shareKey
  Dat(fixtures, {live: false}, function (err, dat) {
    t.error(err, 'live: false share, no error')
    shareDat = dat
    dat.importFiles(function (err) {
      t.error(err, 'import no error')
      shareKey = dat.archive.key
      dat.joinNetwork()
      download()
    })
  })

  function download () {
    testFolder(function () {
      Dat(downloadDir, { key: shareKey }, function (err, dat) {
        t.error(err, 'no download init error')
        t.ok(dat, 'callsback with dat object')
        t.ok(dat.key, 'has key')
        t.ok(dat.archive, 'has archive')
        t.ok(dat.db, 'has db')
        t.ok(dat.owner === false, 'archive not owned')

        var archive = dat.archive

        dat.joinNetwork()

        archive.open(function () {
          t.ok(archive.live === false, 'archive.live is false')
          archive.content.once('download-finished', function () {
            done()
          })
        })

        function done () {
          fs.readdir(downloadDir, function (_, files) {
            var hasCsvFile = files.indexOf('table.csv') > -1
            var hasDatFolder = files.indexOf('.dat') > -1
            t.ok(hasDatFolder, '.dat folder created')
            t.ok(hasCsvFile, 'csv file downloaded')

            dat.close(function () {
              t.pass('close callback ok')
              t.end()
            })
          })
        }
      })
    })
  }
})

test('finished', function (t) {
  shareDat.close(function () {
    shareDat.db.close(function () {
      rimraf.sync(path.join(fixtures, '.dat'))
      t.end()
    })
  })
})

test.onFinish(function () {
  rimraf.sync(downloadDir)
})

function testFolder (cb) {
  // Delete old folder and make new one
  if (downloadDir && downloadDir.length) rimraf.sync(downloadDir)
  downloadDir = path.join(os.tmpdir(), 'dat-download-tests-' + new Date().getTime())
  mkdirp(downloadDir, cb)
}
