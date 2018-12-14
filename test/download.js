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

// TODO:
// rest of download tests
// tests will be a lot better with some download-finished type check
// e.g. https://github.com/mafintosh/hypercore/pull/86

// if (!process.env.TRAVIS) {
//   test('download and live update (new file)', function (t) {
//     var dat = downloadDat // use previous test download
//     var archive = dat.archive
//     var newFile = path.join(fixtures, 'new.txt')

//     archive.metadata.on('update', function () {
//       t.pass('metadata update fires')
//     })

//     archive.on('download-finished', function () {
//       t.skip('TODO: download finished fires again')
//     })

//     dat.stats.once('update:filesTotal', function () {
//       t.same(dat.stats.get().filesTotal, fixtureStats.filesTotal + 1, 'filesTotal has one more')
//     })

//     dat.stats.on('update:blocksProgress', function () {
//       var st = dat.stats.get()
//       // TODO: blocksProgress === blocksTotal (bug in stats?)
//       if (st.blocksTotal && st.blocksProgress >= st.blocksTotal) return done()
//     })

//     addShareFile()

//     function addShareFile () {
//       fs.writeFileSync(newFile, 'helloooooo')
//     }

//     function done () {
//       // shareDat file watching is closing without callback and causing trouble
//       dat.close(function () {
//         fs.unlink(newFile, function () {
//           t.end()
//         })
//       })
//     }
//   })
// }

// test('Download with sparse', function (t) {
//   testFolder(function () {
//     Dat(downloadDir, {key: shareKey, sparse: true}, function (err, dat) {
//       t.error(err, 'no download init error')
//       t.ok(dat, 'callsback with dat object')
//       t.ok(dat.options.sparse, 'sparse option set')
//       t.ok(dat.archive.options.sparse, 'sparse option set')
//       t.ok(dat.archive._sparse, 'sparse option set')

//       var archive = dat.archive
//       downloadDat = dat

//       archive.open(function () {
//         archive.get('table.csv', function (err, entry) {
//           t.ifError(err)
//           archive.download(entry, function (err) {
//             t.ifError(err)
//             done()
//           })
//         })
//       })

//       var network = dat.joinNetwork()
//       network.once('connection', function () {
//         t.pass('connects via network')
//       })

//       function done () {
//         fs.readdir(downloadDir, function (_, files) {
//           var hasCsvFile = files.indexOf('table.csv') > -1
//           var hasDatFolder = files.indexOf('.dat') > -1
//           t.ok(hasDatFolder, '.dat folder created')
//           t.ok(hasCsvFile, 'csv file downloaded')
//           t.same(files.length, 2, 'two items in download dir')
//           downloadDat.close(function () {
//             t.end()
//           })
//         })
//       }
//     })
//   })
// })

// test('Download pause', function (t) {
//   testFolder(function () {
//     Dat(downloadDir, {key: shareKey}, function (err, dat) {
//       t.error(err, 'no download init error')

//       var paused = false
//       dat.joinNetwork({ dht: false }).once('connection', function () {
//         dat.pause()
//         paused = true

//         dat.archive.on('download', failDownload)

//         setTimeout(function () {
//           dat.archive.removeListener('download', failDownload)
//           dat.resume()
//           paused = false
//         }, 500)

//         function failDownload () {
//           if (paused) t.fail('download when paused')
//         }
//       })

//       dat.archive.open(function () {
//         dat.archive.content.on('download-finished', done)
//       })

//       function done () {
//         t.pass('finished download after resume')
//         if (dat._closed) return
//         dat.close(function (err) {
//           t.error(err, 'no error')
//           t.end()
//         })
//       }
//     })
//   })
// })

// test('download from snapshot', function (t) {
//   var shareKey
//   var snapshotDat
//   Dat(fixtures, {live: false}, function (err, dat) {
//     t.error(err, 'live: false share, no error')
//     snapshotDat = dat
//     dat.importFiles(function (err) {
//       t.error(err, 'import no error')
//       dat.archive.finalize(function (err) {
//         t.error(err, 'no error')
//         shareKey = dat.archive.key
//         dat.joinNetwork()
//         download()
//       })
//     })
//   })

//   function download () {
//     testFolder(function () {
//       Dat(downloadDir, { key: shareKey }, function (err, dat) {
//         t.error(err, 'no download init error')
//         t.ok(dat, 'callsback with dat object')
//         t.ok(dat.key, 'has key')
//         t.ok(dat.archive, 'has archive')
//         t.ok(dat.db, 'has db')
//         t.ok(dat.owner === false, 'archive not owned')

//         var archive = dat.archive

//         dat.joinNetwork()

//         archive.open(function () {
//           t.ok(archive.live === false, 'archive.live is false')
//           archive.content.once('download-finished', function () {
//             done()
//           })
//         })

//         function done () {
//           fs.readdir(downloadDir, function (_, files) {
//             var hasCsvFile = files.indexOf('table.csv') > -1
//             var hasDatFolder = files.indexOf('.dat') > -1
//             t.ok(hasDatFolder, '.dat folder created')
//             t.ok(hasCsvFile, 'csv file downloaded')

//             dat.close(function () {
//               t.pass('close callback ok')
//               snapshotDat.close(function () {
//                 rimraf.sync(path.join(fixtures, '.dat'))
//                 t.end()
//               })
//             })
//           })
//         }
//       })
//     })
//   }
// })

// test.onFinish(function () {
//   rimraf.sync(downloadDir)
// })

function shareFixtures (opts, cb) {
  if (typeof opts === 'function') cb = opts
  if (!opts) opts = {}

  rimraf.sync(path.join(fixtures, '.dat')) // for previous failed tests
  Dat(fixtures, { temp: true }, function (err, dat) {
    if (err) return cb(err)
    dat.joinNetwork({ dht: false })
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
