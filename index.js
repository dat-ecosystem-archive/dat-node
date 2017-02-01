var assert = require('assert')
var hyperdrive = require('hyperdrive')
var xtend = require('xtend')
var path = require('path')
var untildify = require('untildify')
var debug = require('debug')('dat-node')
var initArchive = require('./lib/init-archive')
var Dat = require('./dat')

module.exports = createDat

function createDat (dirOrDrive, opts, cb) {
  assert.ok(dirOrDrive, 'directory or drive required')
  if (typeof opts === 'function') return createDat(dirOrDrive, {}, opts)

  opts = xtend(opts)

  // Figure out what first arg is
  if (typeof dirOrDrive === 'string') opts.dir = dirOrDrive
  else if (dirOrDrive instanceof hyperdrive) opts.drive = dirOrDrive // TODO: will this fail if our hyperdrive vesrion is different?
  else return cb(new Error('first argument must either be a directory or hyperdrive instance'))

  // TODO: this is a multidrive thing, make it part of this API?
  if (!opts.dir && opts.drive.location) opts.dir = opts.drive.location
  else if (!opts.dir) return cb(new Error('opts.dir must be specified'))

  opts.dir = path.resolve(untildify(opts.dir))

  debug('Running initArchive on', opts.dir, 'with opts:', opts)
  initArchive(opts, function (err, archive, db) {
    if (err) return cb(err)
    debug('initArchive callback')
    var dat = new Dat(archive, db, opts)
    cb(null, dat)
  })
}
