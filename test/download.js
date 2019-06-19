var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var tmpDir = require('temporary-directory')
var helpers = require('./helpers')

var Dat = require('..')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

var fixtures = path.join(__dirname, 'fixtures')

test('download: Download with default opts', function (t) {
  shareFixtures(function (err, shareKey, closeShare) {
    t.error(err, 'error')

    tmpDir(function (err, downDir, cleanup) {
      t.error(err, 'error')

      Dat(downDir, { key: shareKey }, function (err, dat) {
        t.error(err, 'error')
        t.ok(dat, 'callsback with dat object')
        t.ok(dat.key, 'has key')
        t.ok(dat.archive, 'has archive')
        t.notOk(dat.writable, 'archive not writable')

        var stats = dat.trackStats()
        var network = dat.joinNetwork(function () {
          t.pass('joinNetwork calls back okay')
        })
        network.once('connection', function () {
          t.pass('connects via network')
        })
        var archive = dat.archive
        archive.once('content', function () {
          t.pass('gets content')
          archive.content.on('sync', done)
        })

        function done () {
          var st = stats.get()
          t.ok(st.version === archive.version, 'stats version correct')
          t.ok(st.downloaded === st.length, 'all blocks downloaded')
          helpers.verifyFixtures(t, archive, function (err) {
            t.error(err, 'error')
            t.ok(dat.network, 'network is open')
            dat.close(function (err) {
              t.error(err, 'error')
              t.equal(dat.network, undefined, 'network is closed')
              cleanup(function (err) {
                t.error(err, 'error')
                closeShare(function (err) {
                  t.error(err, 'error')
                  t.end()
                })
              })
            })
          })
        }
      })
    })
  })
})

function shareFixtures (opts, cb) {
  if (typeof opts === 'function') cb = opts
  if (!opts) opts = {}

  rimraf.sync(path.join(fixtures, '.dat')) // for previous failed tests
  Dat(fixtures, { temp: true }, function (err, dat) {
    if (err) return cb(err)
    dat.joinNetwork({ dht: false, utp: false })
    dat.importFiles(function (err) {
      if (err) return cb(err)
      cb(null, dat.key, close)
    })

    function close (cb) {
      dat.close(function (err) {
        cb(err)
        // rimraf if we need it?
      })
    }
  })
}
