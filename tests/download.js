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
var stats = {
  filesTotal: 2,
  bytesTotal: 1441
}

test('prep', function (t) {
  shareDat = Dat({dir: fixtures})
  shareDat.share(function (err) {
    if (err) throw err
    testFolder(function () {
      t.end()
    })
  })
  shareDat.once('key', function (key) {
    shareKey = key
  })
})

test('Download with default opts', function (t) {
  var dat = downloadDat = Dat({dir: downloadDir, key: shareKey})
  dat.download(function (err) {
    t.error(err)
    t.fail('live archive should not call callback')
  })

  dat.once('key', function (key) {
    t.ok(key, 'key emitted')
  })

  dat.on('file-downloaded', function (entry) {
    t.skip('TODO: this is firing after file-downloaded')
  })

  dat.once('download-finished', function () {
    t.same(dat.stats.filesTotal, stats.filesTotal, 'files total match')
    t.same(dat.stats.bytesTotal, stats.bytesTotal, 'bytes total match')
    t.pass('download finished event')

    fs.readdir(downloadDir, function (_, files) {
      var hasCsvFile = files.indexOf('all_hour.csv') > -1
      var hasDatFolder = files.indexOf('.dat') > -1
      t.ok(hasDatFolder, '.dat folder created')
      t.ok(hasCsvFile, 'csv file downloaded')

      if (files.indexOf('folder') > -1) {
        var subFiles = fs.readdirSync(path.join(downloadDir, 'folder'))
        var hasEmtpy = subFiles.indexOf('empty.txt') > -1
        t.skip(hasEmtpy, 'empty.txt file downloaded')
        // TODO: known hyperdrive issue https://github.com/mafintosh/hyperdrive/issues/83
      }
      dat.removeAllListeners()
      t.end()
    })
  })
})

test('download and live update', function (t) {
  var dat = downloadDat // use previous test download

  updateShareFile()

  dat.on('archive-updated', function () {
    t.pass('archive updated event')
  })

  dat.on('file-downloaded', function (file) {
    t.ok(file.name.indexOf('empty.txt') > -1, 'file updated')
    t.end()
  })

  dat.on('download-finished', function () {
    t.skip('TODO: download finished fires again')
    // t.end()
  })

  function updateShareFile () {
    fs.writeFileSync(path.join(fixtures, 'folder', 'empty.txt'), '')
  }
})

test('close first test', function (t) {
  shareDat.close(function () {
    rimraf.sync(path.join(fixtures, '.dat'))
    downloadDat.close(function () {
      t.end()
    })
  })
})

test('download from snapshot', function (t) {
  var shareKey
  shareDat = Dat({dir: fixtures, snapshot: true})
  shareDat.share()
  shareDat.once('key', function (key) {
    shareKey = key
    download()
  })

  function download () {
    testFolder(function () {
      var downDat = Dat({key: shareKey, dir: downloadDir})
      downDat.download(function (err) {
        t.error(err, 'download callback error')
        t.pass('callback called for non-live archive')
        fs.readdir(downloadDir, function (_, files) {
          var hasCsvFile = files.indexOf('all_hour.csv') > -1
          var hasDatFolder = files.indexOf('.dat') > -1
          t.ok(hasDatFolder, '.dat folder created')
          t.ok(hasCsvFile, 'csv file downloaded')

          downDat.close(function () {
            t.pass('close callback ok')
            t.end()
          })
        })
      })

      downDat.once('download-finished', function () {
        t.pass('download finished')
        t.ok(!downDat.live, 'live value false')
      })
    })
  }
})

test('finished', function (t) {
  shareDat.close(function () {
    t.end()
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
