var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')

var Dat = require('..')
var fixtures = path.join(__dirname, 'fixtures')

test('importing: custom ignore extends default (string)', function (t) {
  rimraf.sync(path.join(fixtures, '.dat')) // for previous failed tests
  Dat(fixtures, {temp: true}, function (err, dat) {
    t.error(err)
    dat.importFiles({ ignore: '**/*.js' }, function () {
      var shouldIgnore = dat.options.importer.ignore
      t.ok(shouldIgnore('.dat'), '.dat folder ignored')
      t.ok(shouldIgnore('foo/bar.js'), 'custom ignore works')
      t.notOk(shouldIgnore('foo/bar.txt'), 'txt file gets to come along =)')
      dat.close(function () {
        t.end()
      })
    })
  })
})

test('importing: custom ignore extends default (array)', function (t) {
  Dat(fixtures, {temp: true}, function (err, dat) {
    t.error(err)
    dat.importFiles({ ignore: ['super_secret_stuff/*', '**/*.txt'] }, function () {
      var shouldIgnore = dat.options.importer.ignore

      t.ok(shouldIgnore('.dat'), '.dat still feeling left out =(')
      t.ok(shouldIgnore('password.txt'), 'file ignored')
      t.ok(shouldIgnore('super_secret_stuff/file.js'), 'secret stuff stays secret')
      t.notOk(shouldIgnore('foo/bar.js'), 'js file joins the party =)')
      dat.close(function () {
        t.end()
      })
    })
  })
})

test('importing: ignore hidden option turned off', function (t) {
  Dat(fixtures, {temp: true}, function (err, dat) {
    t.error(err)
    dat.importFiles({ ignoreHidden: false }, function () {
      var shouldIgnore = dat.options.importer.ignore

      t.ok(shouldIgnore('.dat'), '.dat still feeling left out =(')
      t.notOk(shouldIgnore('.other-hidden'), 'hidden file NOT ignored')
      t.notOk(shouldIgnore('dir/.git'), 'hidden folders with dir NOT ignored')
      dat.close(function () {
        rimraf.sync(path.join(fixtures, '.dat'))
        t.end()
      })
    })
  })
})

test('importing: import with options but no callback', function (t) {
  Dat(fixtures, {temp: true}, function (err, dat) {
    t.error(err)
    var importer = dat.importFiles({ dryRun: true })
    importer.on('error', function (err) {
      t.error(err, 'no error')
    })
    dat.close(function (err) {
      t.error(err, 'no err')
      rimraf.sync(path.join(fixtures, '.dat'))
      t.end()
    })
  })
})

test('importing: import with .datignore', function (t) {
  fs.writeFileSync(path.join(fixtures, '.datignore'), 'ignoreme.txt')
  fs.writeFileSync(path.join(fixtures, 'ignoreme.txt'), 'hello world')
  Dat(fixtures, {temp: true}, function (err, dat) {
    t.error(err)
    var importer = dat.importFiles(function (err) {
      t.error(err)

      var shouldIgnore = dat.options.importer.ignore
      t.ok(shouldIgnore('.dat'), '.dat ignored')
      dat.close(function () {
        fs.unlinkSync(path.join(fixtures, '.datignore'))
        fs.unlinkSync(path.join(fixtures, 'ignoreme.txt'))
        rimraf.sync(path.join(fixtures, '.dat'))
        t.end()
      })
    })
    importer.on('put', function (file) {
      if (file.name.indexOf('ignoreme.txt') > -1) t.fail('ignored file imported')
    })
  })
})

test('importing: import with opts.useDatIgnore false', function (t) {
  fs.writeFileSync(path.join(fixtures, '.datignore'), 'ignoreme.txt')
  fs.writeFileSync(path.join(fixtures, 'ignoreme.txt'), 'hello world')
  Dat(fixtures, {temp: true}, function (err, dat) {
    t.error(err)
    var fileImported = false
    var importer = dat.importFiles({useDatIgnore: false}, function (err) {
      t.error(err)

      var shouldIgnore = dat.options.importer.ignore
      t.ok(shouldIgnore('.dat'), '.dat ignored')
      dat.close(function () {
        if (!fileImported) t.fail('file in .datignore not imported')
        fs.unlinkSync(path.join(fixtures, '.datignore'))
        fs.unlinkSync(path.join(fixtures, 'ignoreme.txt'))
        rimraf.sync(path.join(fixtures, '.dat'))
        t.end()
      })
    })
    importer.on('put', function (file) {
      if (file.name.indexOf('ignoreme.txt') > -1) {
        fileImported = true
        t.pass('ignored file imported')
      }
    })
  })
})
