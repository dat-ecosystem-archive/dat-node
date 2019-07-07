const fs = require('fs')
const path = require('path')
const test = require('tape')
const rimraf = require('rimraf')
const ram = require('random-access-memory')
const countFiles = require('count-files')
const helpers = require('./helpers')

const Dat = require('..')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

const fixtures = path.join(__dirname, 'fixtures')
const fixtureStats = {
  files: 3,
  bytes: 1452,
  dirs: 1
}
let liveKey

test('share: prep', function (t) {
  cleanFixtures(t.end)
})

test('share: create dat with default ops', async (t) => {
  const dat = await Dat(fixtures)
  t.ok(dat.path === fixtures, 'correct directory')
  t.ok(dat.archive, 'has archive')
  t.ok(dat.key, 'has key')
  t.ok(dat.live, 'is live')
  t.ok(dat.writable, 'is writable')
  t.ok(!dat.resumed, 'is not resumed')

  fs.stat(path.join(fixtures, '.dat'), (err, stat) => {
    t.error(err)
    t.pass('creates .dat dir')
  })

  liveKey = dat.key
  const stats = dat.trackStats()
  await dat.joinNetwork()

  await dat.importFiles()
  const archive = dat.archive
  const st = await stats.get()

  t.same(st.files, 3, 'stats files')
  t.same(st.length, 2, 'stats length')
  t.same(st.version, archive.version, 'stats version')
  t.same(st.byteLength, 1452, 'stats bytes')

  t.same(archive.version, 3, 'archive version')
  t.same(archive.metadata.length, 4, 'entries in metadata')

  helpers.verifyFixtures(t, archive, async (err) => {
    t.ifError(err)
    await dat.close()
    t.pass('close okay')
    t.end()
  })
})

test('share: resume with .dat folder', async (t) => {
  const dat = await Dat(fixtures)
  t.ok(dat.writable, 'dat still writable')
  t.ok(dat.resumed, 'resume flag set')
  t.same(liveKey, dat.key, 'key matches previous key')
  const stats = dat.trackStats()

  countFiles({ fs: dat.archive, name: '/' }, async (err, count) => {
    t.ifError(err, 'count err')
    const archive = dat.archive

    t.same(archive.version, 3, 'archive version still')

    const st = await stats.get()
    t.same(st.byteLength, fixtureStats.bytes, 'bytes total still the same')
    t.same(count.bytes, fixtureStats.bytes, 'bytes still ok')
    t.same(count.files, fixtureStats.files, 'bytes still ok')
    await dat.close()
    cleanFixtures(t.end)
  })
})

test('share: resume with empty .dat folder', async (t) => {
  const emptyPath = path.join(__dirname, 'empty')
  const dat = await Dat(emptyPath)
  t.false(dat.resumed, 'resume flag false')
  await dat.close()

  const dat2 = await Dat(emptyPath)
  t.ok(dat2.resumed, 'resume flag set')

  await dat2.close()
  rimraf(emptyPath, t.end)
})

if (!process.env.TRAVIS) {
  test('share: live - editing file', async (t) => {
    const dat = await Dat(fixtures)

    dat.importFiles({ watch: true })
    dat.importer.on('put-end', (src) => {
      if (src.name.indexOf('empty.txt') > -1) {
        if (src.live) return done()
        fs.writeFileSync(path.join(fixtures, 'folder', 'empty.txt'), 'not empty')
      }
    })

    function done () {
      dat.archive.stat('/folder/empty.txt', async (err, stat) => {
        t.ifError(err, 'error')
        t.same(stat.size, 9, 'empty file has new content')
        await dat.close()

        // make file empty again
        fs.writeFileSync(path.join(fixtures, 'folder', 'empty.txt'), '')
        t.end()
      })
    }
  })

  test('share: live resume & create new file', async (t) => {
    const newFile = path.join(fixtures, 'new.txt')
    const dat = await Dat(fixtures)
    t.ok(dat.resumed, 'was resumed')

    dat.importFiles({ watch: true })
    dat.importer.on('put-end', (src) => {
      if (src.name.indexOf('new.txt') === -1) return
      t.ok(src.live, 'file put is live')
      process.nextTick(done)
    })
    setTimeout(writeFile, 500)

    function writeFile () {
      fs.writeFile(newFile, 'hello world', (err) => {
        t.ifError(err, 'error')
      })
    }

    function done () {
      dat.archive.stat('/new.txt', (err, stat) => {
        t.ifError(err, 'error')
        t.ok(stat, 'new file in archive')
        fs.unlink(newFile, async () => {
          await dat.close()
          t.end()
        })
      })
    }
  })
}

test('share: cleanup', (t) => {
  cleanFixtures(t.end)
})

test('share: dir storage and opts.temp', async (t) => {
  const dat = await Dat(fixtures, { temp: true })
  t.false(dat.resumed, 'resume flag false')

  await dat.importFiles()
  helpers.verifyFixtures(t, dat.archive, done)

  async function done (err) {
    t.error(err, 'error')
    await dat.close()
    t.end()
  }
})

test('share: srage & import other dir', async (t) => {
  const dat = await Dat(ram)
  t.false(dat.resumed, 'resume flag false')

  await dat.importFiles(fixtures)
  helpers.verifyFixtures(t, dat.archive, done)

  async function done (err) {
    t.error(err, 'error')
    await dat.close()
    t.end()
  }
})

function cleanFixtures (cb) {
  cb = cb || function () {}
  rimraf(path.join(fixtures, '.dat'), cb)
}
