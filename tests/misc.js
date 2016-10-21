var path = require('path')
var test = require('tape')
var anymatch = require('anymatch')
var rimraf = require('rimraf')
var memdb = require('memdb')

var dat = require('..')

test('default ignore', function (t) {
  dat(process.cwd(), function (err, node) {
    t.error(err, 'no init error')
    var matchers = node.options.ignore
    t.ok(anymatch(matchers, '.dat'), '.dat folder ignored')
    t.ok(anymatch(matchers, '.dat/'), '.dat folder with slash ignored')
    t.ok(anymatch(matchers, '.dat/foo.bar'), 'files in .dat folder ignored')
    t.ok(anymatch(matchers, 'dir/.git'), 'hidden folders with dir ignored')
    t.ok(anymatch(matchers, 'dir/.git/test.txt'), 'files inside hidden dir with dir ignored')
    t.notOk(anymatch(matchers, 'folder/asdf.data/file.txt'), 'weird data folder is ok')
    t.notOk(
      ['file.dat', '.dat.jpg', '.dat-thing'].filter(anymatch(matchers)).length !== 0,
      'does not ignore files/folders with .dat in it')
    node.close(function () {
      node.db.close(function () {
        t.end()
      })
    })
  })
})

test('custom ignore extends default (string)', function (t) {
  dat(process.cwd(), {ignore: '**/*.js'}, function (err, node) {
    t.error(err, 'no init error')
    var matchers = node.options.ignore
    t.ok(Array.isArray(node.options.ignore), 'ignore extended correctly')
    t.ok(anymatch(matchers, '.dat'), '.dat folder ignored')
    t.ok(anymatch(matchers, 'foo/bar.js'), 'custom ignore works')
    t.notOk(anymatch(matchers, 'foo/bar.txt'), 'txt file gets to come along =)')
    node.close(function () {
      node.db.close(function () {
        t.end()
      })
    })
  })
})

test('custom ignore extends default (array)', function (t) {
  dat(process.cwd(), {ignore: ['super_secret_stuff/*', '**/*.txt']}, function (err, node) {
    t.error(err, 'no init error')
    var matchers = node.options.ignore

    t.ok(Array.isArray(node.options.ignore), 'ignore extended correctly')
    t.ok(anymatch(matchers, '.dat'), '.dat still feeling left out =(')
    t.ok(anymatch(matchers, 'password.txt'), 'file ignored')
    t.ok(anymatch(matchers, 'super_secret_stuff/file.js'), 'secret stuff stays secret')
    t.notOk(anymatch(matchers, 'foo/bar.js'), 'js file joins the party =)')
    node.close(function () {
      node.db.close(function () {
        t.end()
      })
    })
  })
})

test('custom db option', function (t) {
  dat(process.cwd(), {db: memdb()}, function (err, node) {
    t.error(err, 'no init error')
    t.ok(node.db.db instanceof require('memdown'), 'db is memdown')

    node.close(function () {
      node.db.close(function () {
        t.end()
      })
    })
  })
})

test('swarm options', function (t) {
  var opts = {utp: false, port: 1234, discovery: {upload: false}, webrtc: false}
  dat(process.cwd(), opts, function (err, node) {
    t.error(err)
    node.once('connecting', function () {
      var swarm = node.swarm

      t.ok(!swarm.opts.discovery.utp, 'utp discovery false')
      t.ok(!swarm.node._utp, 'No utp discovery')

      t.same(swarm.opts.port, 1234, 'port option set on swarm')
      t.same(swarm.node.address().port, 1234, 'port on node swarm okay')

      t.ok(!swarm.uploading, 'Upload false set on swarm')

      t.ok(!swarm.opts.wrtc, 'Swarm webrtc option false')

      node.close(function () {
        node.db.close(function () {
          rimraf(path.join(process.cwd(), '.dat'), function () {
            t.end()
          })
        })
      })
    })
    node._joinSwarm()
  })
})

test('swarm options 3.2.x compat', function (t) {
  dat(process.cwd(), {upload: false}, function (err, node) {
    t.error(err)
    node.once('connecting', function () {
      var swarm = node.swarm
      t.ok(!swarm.uploading, 'Upload false set on swarm')

      node.close(function () {
        node.db.close(function () {
          rimraf(path.join(process.cwd(), '.dat'), function () {
            t.end()
          })
        })
      })
    })
    node._joinSwarm()
  })
})
