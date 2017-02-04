var assert = require('assert')
var xtend = require('xtend')
var path = require('path')
var untildify = require('untildify')
var debug = require('debug')('dat-node')
var initArchive = require('./lib/init-archive')
var Dat = require('./dat')

module.exports = createDat

function createDat (dirOrDrive, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }

  assert.ok(typeof dirOrDrive === 'string' || typeof dirOrDrive === 'object', 'dat-node: dirOrDrive should be type string or type object')
  assert.equal(typeof opts, 'object', 'dat-node: opts should be type object')
  assert.equal(typeof cb, 'function', 'dat-node: cb should be type function')

  opts = xtend(opts)

  if (typeof dirOrDrive === 'string') {
    opts.dir = dirOrDrive
  } else {
    opts.drive = dirOrDrive
  }

  if (!opts.dir) {
    return cb(new Error('opts.dir must be specified'))
  }

  opts.dir = path.resolve(untildify(opts.dir))

  debug('Running initArchive on', opts.dir, 'with opts:', opts)
  initArchive(opts, function (err, archive, db) {
    if (err) return cb(err)
    debug('initArchive callback')
    var dat = new Dat(archive, db, opts)
    cb(null, dat)
  })
}
