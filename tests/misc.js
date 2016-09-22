var path = require('path')
var test = require('tape')
var anymatch = require('anymatch')
var rimraf = require('rimraf')
var memdb = require('memdb')

var Dat = require('..')

test('default ignore', function (t) {
  var dat = Dat({ dir: process.cwd() })
  var matchers = dat.options.ignore
  t.ok(anymatch(matchers, '.dat'), '.dat folder ignored')
  t.ok(anymatch(matchers, '.dat/'), '.dat folder with slash ignored')
  t.ok(anymatch(matchers, '.dat/foo.bar'), 'files in .dat folder ignored')
  t.ok(anymatch(matchers, 'dir/.git'), 'hidden folders with dir ignored')
  t.ok(anymatch(matchers, 'dir/.git/test.txt'), 'files inside hidden dir with dir ignored')
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

test('custom db option', function (t) {
  var dat = Dat({db: memdb(), dir: process.cwd()})
  dat.open(function (err) {
    t.error(err)
    t.ok(dat.db.db instanceof require('memdown'), 'db is memdown')

    dat.close(function () {
      t.end()
    })
  })
})

test('snapshot option', function (t) {
  var dat = Dat({snapshot: true, dir: process.cwd()})
  dat.open(function (err) {
    t.error(err)
    t.ok(dat.options.snapshot, 'snapshot true')
    t.ok(!dat.live, 'dat not live')
    t.ok(!dat.archive.live, 'archive not live')
    t.ok(!dat.options.watchFiles, 'watch files false')

    dat.close(function () {
      dat.db.close(function () {
        rimraf(path.join(process.cwd(), '.dat'), function () {
          t.end()
        })
      })
    })
  })
})

test('swarm options', function (t) {
  var dat = Dat({utp: false, port: 1234, discovery: {upload: false}, webrtc: false, dir: process.cwd()})
  dat.open(function (err) {
    t.error(err)
    dat.once('connecting', function () {
      var swarm = dat.swarm

      t.ok(!swarm.opts.discovery.utp, 'utp discovery false')
      t.ok(!swarm.node._utp, 'No utp discovery')

      t.same(swarm.opts.port, 1234, 'port option set on swarm')
      t.same(swarm.node.address().port, 1234, 'port on node swarm okay')

      t.ok(!swarm.uploading, 'Upload false set on swarm')

      t.ok(!swarm.opts.wrtc, 'Swarm webrtc option false')

      dat.close(function () {
        dat.db.close(function () {
          rimraf(path.join(process.cwd(), '.dat'), function () {
            t.end()
          })
        })
      })
    })
    dat._joinSwarm()
  })
})

test('swarm options 3.2.x compat', function (t) {
  var dat = Dat({upload: false, dir: process.cwd()})
  dat.open(function (err) {
    t.error(err)
    dat.once('connecting', function () {
      var swarm = dat.swarm
      t.ok(!swarm.uploading, 'Upload false set on swarm')

      dat.close(function () {
        dat.db.close(function () {
          rimraf(path.join(process.cwd(), '.dat'), function () {
            t.end()
          })
        })
      })
    })
    dat._joinSwarm()
  })
})
