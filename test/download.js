const fs = require('fs')
const path = require('path')
const test = require('tape')
const rimraf = require('rimraf')
const tmpDir = require('temporary-directory')
const helpers = require('./helpers')

const Dat = require('..')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

const fixtures = path.join(__dirname, 'fixtures')

test('download: Download with default opts', async (t) => {
  const [shareKey, closeShare] = await shareFixtures()

  tmpDir(async function (err, downDir, cleanup) {
    t.error(err, 'error')

    const dat = await Dat(downDir, { key: shareKey })
    t.ok(dat, 'callsback with dat object')
    t.ok(dat.key, 'has key')
    t.ok(dat.archive, 'has archive')
    t.notOk(dat.writable, 'archive not writable')

    const stats = dat.trackStats()
    const network = await dat.joinNetwork()
    network.once('connection', function () {
      t.pass('connects via network')
    })
    const archive = dat.archive
    archive.once('content', function () {
      t.pass('gets content')
      archive.content.on('sync', done)
    })

    async function done () {
      const st = await stats.get()
      t.ok(st.version === archive.version, 'stats version correct')
      t.ok(st.downloaded === st.length, 'all blocks downloaded')
      helpers.verifyFixtures(t, archive, async function (err) {
        t.error(err, 'error')
        t.ok(dat.network, 'network is open')
        try {
          await dat.close()
          t.equal(dat.network, undefined, 'network is closed')
          cleanup(async function (err) {
            t.error(err, 'error here')
            await closeShare()
            t.end()
          })
        } catch (e) {
          t.error(e)
        }
      })
    }
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

async function shareFixtures (opts) {
  if (!opts) opts = {}

  rimraf.sync(path.join(fixtures, '.dat')) // for previous failed tests
  const dat = await Dat(fixtures, { temp: true })
  await dat.joinNetwork({ dht: false })
  await dat.importFiles()

  return [dat.key, close]

  async function close (cb) {
    await dat.close()
  }
}
