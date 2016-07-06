require('leaked-handles')
var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')

var Dat = require('..')

var shareDir = path.join(process.cwd(), 'tests')

test('Share with default opts', function (t) {
  t.plan(6)

  var dat = Dat({dir: shareDir})
  dat.once('ready', function () {
    t.pass('emits ready')

    t.ok(dat.dir === shareDir, 'correct directory')
    fs.stat(path.join(shareDir, '.dat'), function (err, stat) {
      if (err) return console.error(err)
      t.pass('creates .dat dir')
    })

    dat.share(function (err) {
      t.error(err, 'no sharing error')
    })
  })

  dat.on('key', function (key) {
    t.ok(key && key.length === 50, 'emits key')
  })

  dat.once('archive-finalized', function () {
    t.pass('emits archive-finalized')
    endTest(dat)
  })
})

function endTest (dat) {
  rimraf(path.join(dat.dir, '.dat'), function () {
    dat.close()
  })
}
