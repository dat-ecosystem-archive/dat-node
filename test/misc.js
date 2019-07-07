const fs = require('fs')
const path = require('path')
const test = require('tape')
const rimraf = require('rimraf')
const tmpDir = require('temporary-directory')

const Dat = require('..')
const fixtures = path.join(__dirname, 'fixtures')

test('misc: clean old test', (t) => {
  rimraf(path.join(fixtures, '.dat'), t.end)
})

test('misc: empty dat folder ok', (t) => {
  fs.mkdir(path.join(fixtures, '.dat'), async () => {
    const dat = await Dat(fixtures)

    await dat.close()
    rimraf.sync(path.join(fixtures, '.dat'))
    t.end()
  })
})

test('misc: existing invalid dat folder', (t) => {
  fs.mkdir(path.join(fixtures, '.dat'), () => {
    fs.writeFile(path.join(fixtures, '.dat', 'metadata.key'), 'hi', async () => {
      try {
        await Dat(fixtures, { errorIfExists: true })
      } catch (e) {
        t.ok(e, 'errors')
        rimraf.sync(path.join(fixtures, '.dat'))
        t.end()
      }
    })
  })
})

test('misc: non existing invalid dat path', (t) => {
  try {
    Dat('/non/existing/folder/')
  } catch (e) {
    t.ok(e, 'errors')
    t.end()
  }
})

test('misc: expose .key', async (t) => {
  const key = Buffer.alloc(32)
  const dat = await Dat(process.cwd(), { key: key, temp: true })
  t.deepEqual(dat.key, key)
  await dat.close()

  const dat2 = await Dat(fixtures, { temp: true })
  t.notDeepEqual(dat2.key, key)
  await dat2.close()
  t.end()
})

test('misc: expose .writable', async (t) => {
  tmpDir(async (err, downDir, cleanup) => {
    t.error(err, 'error')
    const shareDat = await Dat(fixtures)
    t.ok(shareDat.writable, 'is writable')
    await shareDat.joinNetwork()

    const downDat = await Dat(downDir, { key: shareDat.key })
    t.notOk(downDat.writable, 'not writable')

    await shareDat.close()
    await downDat.close()
    cleanup((err) => {
      rimraf.sync(path.join(fixtures, '.dat'))
      t.error(err, 'error')
      t.end()
    })
  })
})

test('misc: expose swarm.connected', async (t) => {
  tmpDir(async (err, downDir, cleanup) => {
    t.error(err, 'error')

    const shareDat = await Dat(fixtures, { temp: true })
    t.doesNotThrow(shareDat.leave, 'leave before join should be noop')

    const network = await shareDat.joinNetwork()
    t.equal(network.connected, 0, '0 peers')

    const downDat = await Dat(downDir, { key: shareDat.key, temp: true })
    downDat.joinNetwork()

    network.once('connection', async () => {
      t.ok(network.connected >= 1, '>=1 peer')
      await shareDat.leave()
      t.ok(downDat.network.connected, 0, '0 peers') // TODO: Fix connection count

      await downDat.close()
      await shareDat.close()
      t.error(err, 'error')
      cleanup(function (err) {
        t.error(err, 'error')
        t.end()
      })
    })
  })
})

test('misc: close twice errors', async (t) => {
  Dat(fixtures, { temp: true }, function (err, dat) {
    t.error(err, 'error')
    dat.close(function (err) {
      t.error(err, 'error')
      dat.close(function (err) {
        t.ok(err, 'has close error second time')
        t.end()
      })
    })
  })
})

test('misc: close twice sync errors', async (t) => {
  Dat(fixtures, { temp: true }, function (err, dat) {
    t.error(err, 'error')
    dat.close(function (err) {
      t.error(err, 'error')
      t.end()
    })
    dat.close(function (err) {
      t.ok(err, 'has close error second time')
    })
  })
})

test('misc: create key and open with different key', async (t) => {
  t.skip('TODO')
  t.end()
  // TODO: hyperdrive needs to forward hypercore metadta errors
  // https://github.com/mafintosh/hyperdrive/blob/master/index.js#L37

  // rimraf.sync(path.join(fixtures, '.dat'))
  // Dat(fixtures, function (err, dat) {
  //   t.error(err, 'error')
  //   dat.close(function (err) {
  //     t.error(err, 'error')
  //     Dat(fixtures, {key: '6161616161616161616161616161616161616161616161616161616161616161'}, function (err, dat) {
  //       t.same(err.message, 'Another hypercore is stored here', 'has error')
  //       rimraf.sync(path.join(fixtures, '.dat'))
  //       t.end()
  //     })
  //   })
  // })
})

test('misc: make dat with random key and open again', async (t) => {
  tmpDir(async (err, downDir, cleanup) => {
    t.error(err, 'error')
    var key = '6161616161616161616161616161616161616161616161616161616161616161'
    Dat(downDir, { key: key }, function (err, dat) {
      t.error(err, 'error')
      t.ok(dat, 'has dat')
      dat.close(function (err) {
        t.error(err, 'error')
        Dat(downDir, { key: key }, function (err, dat) {
          t.error(err, 'error')
          t.ok(dat, 'has dat')
          t.end()
        })
      })
    })
  })
})

test('misc: close order', async (t) => {
  tmpDir(async (err, downDir, cleanup) => {
    t.error(err, 'opened tmp dir')
    Dat(downDir, { watch: true }, function (err, dat) {
      t.error(err, 'dat properly opened')
      dat.importFiles(function (err) {
        t.error(err, 'started importing files')
        t.ok(dat.importer, 'importer exists')
        dat.joinNetwork({ dht: false }, function (err) {
          t.error(err, 'joined network')
          var order = []
          dat.network.on('error', function (err) {
            t.error(err)
          })
          dat.network.on('close', function () {
            order.push('network')
          })
          dat.importer.on('destroy', function () {
            order.push('importer')
          })
          dat.archive.metadata.on('close', function () {
            order.push('metadata')
          })
          dat.archive.content.on('close', function () {
            order.push('content')
            t.deepEquals(order, ['network', 'importer', 'metadata', 'content'], 'Close order as expected')
            t.end()
          })
          dat.close()
        })
      })
    })
  })
})
