const fs = require('fs')
const path = require('path')
const test = require('tape')
const rimraf = require('rimraf')
const countFiles = require('count-files')
const tmpDir = require('temporary-directory')

const Dat = require('..')
const fixtures = path.join(__dirname, 'fixtures')

test('importing: import directory', async (t) => {
  rimraf.sync(path.join(fixtures, '.dat')) // for previous failed tests
  const dat = await Dat(fixtures, { temp: true })
  await dat.importFiles()

  countFiles({ fs: dat.archive, name: '/' }, async (err, count) => {
    t.error(err, 'error')
    t.same(count.files, 3, '3 files total')
    await dat.close()
    t.end()
  })
})
test('importing: import two directories at same time', async (t) => {
  rimraf.sync(path.join(fixtures, '.dat')) // for previous failed tests
  const dat = await Dat(fixtures, { temp: true })
  await dat.importFiles({ keepExisting: true })
  await dat.importFiles(path.join(__dirname, '..', 'examples'))

  countFiles({ fs: dat.archive, name: '/' }, async (err, count) => {
    t.error(err, 'error')
    t.same(count.files, 6, 'five files total')
    await dat.close()
    t.end()
  })
})

test('importing: custom ignore extends default (string)', async (t) => {
  rimraf.sync(path.join(fixtures, '.dat')) // for previous failed tests

  const dat = await Dat(fixtures, { temp: true })
  await dat.importFiles({ ignore: '**/*.js' })

  const shouldIgnore = dat.options.importer.ignore
  t.ok(shouldIgnore('.dat'), '.dat folder ignored')
  t.ok(shouldIgnore('foo/bar.js'), 'custom ignore works')
  t.notOk(shouldIgnore('foo/bar.txt'), 'txt file gets to come along =)')

  await dat.close()
  t.end()
})

test('importing: custom ignore extends default (array)', async (t) => {
  const dat = await Dat(fixtures, { temp: true })
  await dat.importFiles({ ignore: ['super_secret_stuff/*', '**/*.txt'] })

  const shouldIgnore = dat.options.importer.ignore

  t.ok(shouldIgnore('.dat'), '.dat still feeling left out =(')
  t.ok(shouldIgnore('password.txt'), 'file ignored')
  t.ok(shouldIgnore('super_secret_stuff/file.js'), 'secret stuff stays secret')
  t.notOk(shouldIgnore('foo/bar.js'), 'js file joins the party =)')

  await dat.close()
  t.end()
})

test('importing: ignore hidden option turned off', async (t) => {
  const dat = await Dat(fixtures, { temp: true })

  await dat.importFiles({ ignoreHidden: false })

  const shouldIgnore = dat.options.importer.ignore
  t.ok(shouldIgnore('.dat'), '.dat still feeling left out =(')
  t.notOk(shouldIgnore('.other-hidden'), 'hidden file NOT ignored')
  t.notOk(shouldIgnore('dir/.git'), 'hidden folders with dir NOT ignored')

  await dat.close()
  rimraf.sync(path.join(fixtures, '.dat'))
  t.end()
})

test('importing: ignore dirs option turned off', async (t) => {
  const dat = await Dat(fixtures, { temp: true })

  await dat.importFiles({ ignoreDirs: false })

  const stream = dat.archive.history()
  let hasFolder = false
  let hasRoot = false
  stream.on('data', function (data) {
    if (data.name === '/folder') hasFolder = true
    if (data.name === '/') hasRoot = true
  })
  stream.on('end', async () => {
    t.ok(hasFolder, 'folder in metadata')
    t.ok(hasRoot, 'root in metadata')

    await dat.close()
    rimraf.sync(path.join(fixtures, '.dat'))
    t.end()
  })
})

test('importing: import with .datignore', async (t) => {
  fs.writeFileSync(path.join(fixtures, '.datignore'), 'ignoreme.txt')
  fs.writeFileSync(path.join(fixtures, 'ignoreme.txt'), 'hello world')

  const dat = await Dat(fixtures, { temp: true })
  dat.importFiles()
  dat.importer.on('put', function (file) {
    if (file.name.indexOf('ignoreme.txt') > -1) t.fail('ignored file imported')
  })

  const shouldIgnore = dat.options.importer.ignore
  t.ok(shouldIgnore('.dat'), '.dat ignored')

  await dat.close()
  fs.unlinkSync(path.join(fixtures, '.datignore'))
  fs.unlinkSync(path.join(fixtures, 'ignoreme.txt'))
  rimraf.sync(path.join(fixtures, '.dat'))
  t.end()
})

test('importing: import with opts.useDatIgnore false', async (t) => {
  fs.writeFileSync(path.join(fixtures, '.datignore'), 'ignoreme.txt')
  fs.writeFileSync(path.join(fixtures, 'ignoreme.txt'), 'hello world')

  const dat = await Dat(fixtures, { temp: true })
  dat.importFiles({ useDatIgnore: false })

  const shouldIgnore = dat.options.importer.ignore
  t.ok(shouldIgnore('.dat'), '.dat ignored')
  t.ok(!shouldIgnore('ignoreme.txt'), 'ignoreme.txt not ignored')
  dat.importer.on('ignore', (file) => {
    if (file.name.indexOf('ignoreme.txt') > -1) {
      t.fail('ignored file not imported')
    }
  })

  await dat.close()
  fs.unlinkSync(path.join(fixtures, '.datignore'))
  fs.unlinkSync(path.join(fixtures, 'ignoreme.txt'))
  rimraf.sync(path.join(fixtures, '.dat'))
  t.end()
})

test('importing: import from hidden folder src', (t) => {
  tmpDir(async (_, dir, cleanup) => {
    dir = path.join(dir, '.hidden')
    fs.mkdirSync(dir)
    fs.writeFileSync(path.join(dir, 'hello.txt'), 'hello world')
    const dat = await Dat(dir, { temp: true })
    await dat.importFiles()

    t.same(dat.archive.version, 1, 'archive has 1 file')
    dat.archive.stat('/hello.txt', async (err, stat) => {
      t.error(err, 'no error')
      t.ok(stat, 'file added')
      await dat.close()
      cleanup(t.end)
    })
  })
})
