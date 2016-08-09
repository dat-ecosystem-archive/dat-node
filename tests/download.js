var fs = require('fs')
var path = require('path')
var os = require('os')
var test = require('tape')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')

var Dat = require('..')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

var shareDat
var shareKey
var fixtures = path.join(__dirname, 'fixtures')
var stats = {
  filesTotal: 2,
  bytesTotal: 1441
}
var downloadDir = path.join(os.tmpdir(), 'dat-download-tests')

test('prep', function (t) {
  shareDat = Dat({dir: fixtures})
  shareDat.once('ready', function () {
    shareDat.share(function (err) {
      if (err) throw err
      testFolder(function () {
        t.end()
      })
    })
  })
  shareDat.once('key', function (key) {
    shareKey = key
  })
})

test('Download with default opts', function (t) {
  var dat = Dat({dir: downloadDir, key: shareKey})
  dat.once('ready', function () {
    dat.download(function (err) {
      t.error(err)
    })

    dat.once('download-finished', function () {
      t.same(dat.stats.filesTotal, stats.filesTotal, 'files total match')
      t.same(dat.stats.bytesTotal, stats.bytesTotal, 'bytes total match')
      t.pass('download finished event')
      dat.close(function () {
        t.end()
      })
    })
  })
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
  rimraf(downloadDir, function () {
    mkdirp(downloadDir, cb)
  })
}
