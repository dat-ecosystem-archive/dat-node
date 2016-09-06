var test = require('tape')
var anymatch = require('anymatch')

var Dat = require('..')

test('default ignore', function (t) {
  var dat = Dat({ dir: process.cwd() })
  var matchers = dat.options.ignore
  t.ok(anymatch(matchers, '.dat'), '.dat folder ignored')
  t.ok(anymatch(matchers, '.dat/'), '.dat folder with slash ignored')
  t.ok(anymatch(matchers, '.dat/foo.bar'), 'files in .dat folder ignored')
  t.notOk(anymatch(matchers, 'file.dat'), 'does not ignore files with .dat in it')
  t.notOk(anymatch(matchers, 'folder/asdf.data/file.txt'), 'weird data folder is ok')
  t.end()
})

test('custom ignore extends default (string)', function (t) {
  var dat = Dat({ ignore: '**/*.js', dir: process.cwd() })
  var matchers = dat.options.ignore

  t.ok(Array.isArray(dat.options.ignore), 'ignore extended correctly')
  t.ok(anymatch(matchers, '.dat'), '.dat folder ignored')
  t.ok(anymatch(matchers, 'foo/bar.js'), 'custom ignore works')
  t.notOk(anymatch(matchers, 'foo/bar.txt'), 'txt file gets to come along =)')
  t.end()
})

test('custom ignore extends default (array)', function (t) {
  var dat = Dat({ ignore: ['super_secret_stuff/*', '**/*.txt'], dir: process.cwd() })
  var matchers = dat.options.ignore

  t.ok(Array.isArray(dat.options.ignore), 'ignore extended correctly')
  t.ok(anymatch(matchers, '.dat'), '.dat still feeling left out =(')
  t.ok(anymatch(matchers, 'password.txt'), 'file ignored')
  t.ok(anymatch(matchers, 'super_secret_stuff/file.js'), 'secret stuff stays secret')
  t.notOk(anymatch(matchers, 'foo/bar.js'), 'js file joins the party =)')
  t.end()
})
