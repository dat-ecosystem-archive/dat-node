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
