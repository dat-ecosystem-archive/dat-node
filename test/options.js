const path = require('path')
const test = require('tape')
const rimraf = require('rimraf')
const encoding = require('dat-encoding')

const Dat = require('..')
const fixtures = path.join(__dirname, 'fixtures')

test('opts: string or buffer .key', async (t) => {
  rimraf.sync(path.join(process.cwd(), '.dat')) // for failed tests
  const buf = Buffer.alloc(32)
  const dat = await Dat(process.cwd(), { key: buf })
  t.deepEqual(dat.archive.key, buf, 'keys match')

  await dat.close()

  const dat2 = await Dat(process.cwd(), { key: encoding.encode(buf) })
  t.deepEqual(dat2.archive.key, buf, 'keys match still')
  await dat2.close()
  rimraf.sync(path.join(process.cwd(), '.dat'))
  t.end()
})

test('opts: createIfMissing false', async (t) => {
  rimraf.sync(path.join(fixtures, '.dat'))
  let dat
  try {
    dat = await Dat(fixtures, { createIfMissing: false })
  } catch (e) {
    t.ok(e, 'errors')
    t.end()
  }
  if (dat) t.fail('dat should not be created')
})

test('opts: errorIfExists true', async (t) => {
  rimraf.sync(path.join(fixtures, '.dat'))
  // create dat to resume from
  const dat = await Dat(fixtures)
  await dat.close()

  let dat2
  try {
    dat2 = await Dat(fixtures, { errorIfExists: true })
  } catch (e) {
    t.ok(e, 'errors')
    t.end()
  }
  if (dat2) t.fail('dat should not be created')
})

test('opts: errorIfExists true without existing dat', async (t) => {
  rimraf.sync(path.join(fixtures, '.dat'))
  await Dat(fixtures, { errorIfExists: true })
  t.pass()
  t.end()
})
