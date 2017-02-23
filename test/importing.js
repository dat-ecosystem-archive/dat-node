var path = require('path')
var test = require('tape')
var anymatch = require('anymatch')
var rimraf = require('rimraf')

var Dat = require('..')
var shareFolder = path.join(__dirname, 'fixtures')

test('default ignore', function (t) {
  rimraf.sync(path.join(shareFolder, '.dat')) // for previous failed tests
  Dat(shareFolder, function (err, dat) {
    t.error(err)
    dat.importFiles(function () {
      var matchers = dat.importer.options.ignore

      t.ok(anymatch(matchers, '.dat'), '.dat folder ignored')
      t.ok(anymatch(matchers, '.dat/'), '.dat folder with slash ignored')
      t.ok(anymatch(matchers, '.dat/foo.bar'), 'files in .dat folder ignored')
      t.ok(anymatch(matchers, 'dir/.git'), 'hidden folders with dir ignored')
      t.ok(anymatch(matchers, 'dir/.git/test.txt'), 'files inside hidden dir with dir ignored')
      t.notOk(anymatch(matchers, 'folder/asdf.data/file.txt'), 'weird data folder is ok')
      t.notOk(
        ['file.dat', '.dat.jpg', '.dat-thing'].filter(anymatch(matchers)).length !== 0,
        'does not ignore files/folders with .dat in it')
      dat.close(function () {
        t.end()
      })
    })
  })
})

test('custom ignore extends default (string)', function (t) {
  Dat(shareFolder, function (err, dat) {
    t.error(err)
    dat.importFiles({ ignore: '**/*.js' }, function () {
      var matchers = dat.options.importer.ignore

      t.ok(Array.isArray(dat.options.importer.ignore), 'ignore extended correctly')
      t.ok(anymatch(matchers, '.dat'), '.dat folder ignored')
      t.ok(anymatch(matchers, 'foo/bar.js'), 'custom ignore works')
      t.notOk(anymatch(matchers, 'foo/bar.txt'), 'txt file gets to come along =)')
      dat.close(function () {
        t.end()
      })
    })
  })
})

test('custom ignore extends default (array)', function (t) {
  Dat(shareFolder, function (err, dat) {
    t.error(err)
    dat.importFiles({ ignore: ['super_secret_stuff/*', '**/*.txt'] }, function () {
      var matchers = dat.options.importer.ignore

      t.ok(Array.isArray(dat.options.importer.ignore), 'ignore extended correctly')
      t.ok(anymatch(matchers, '.dat'), '.dat still feeling left out =(')
      t.ok(anymatch(matchers, 'password.txt'), 'file ignored')
      t.ok(anymatch(matchers, 'super_secret_stuff/file.js'), 'secret stuff stays secret')
      t.notOk(anymatch(matchers, 'foo/bar.js'), 'js file joins the party =)')
      dat.close(function () {
        t.end()
      })
    })
  })
})

test('ignore hidden option turned off', function (t) {
  Dat(shareFolder, function (err, dat) {
    t.error(err)
    dat.importFiles({ ignoreHidden: false }, function () {
      var matchers = dat.options.importer.ignore

      t.ok(Array.isArray(dat.options.importer.ignore), 'ignore extended correctly')
      t.ok(anymatch(matchers, '.dat'), '.dat still feeling left out =(')
      t.notOk(anymatch(matchers, '.other-hidden'), 'hidden file NOT ignored')
      t.notOk(anymatch(matchers, 'dir/.git'), 'hidden folders with dir NOT ignored')
      dat.close(function () {
        rimraf.sync(path.join(shareFolder, '.dat'))
        t.end()
      })
    })
  })
})

test('import with options but no callback', function (t) {
  Dat(shareFolder, function (err, dat) {
    t.error(err)
    var importer = dat.importFiles({ dryRun: true })
    importer.on('error', function (err) {
      t.error(err, 'no error')
    })
    dat.close(function (err) {
      t.error(err, 'no err')
      rimraf.sync(path.join(shareFolder, '.dat'))
      t.end()
    })
  })
})

test('import with .datignore', function (t) {
  t.fail('nope')
})
