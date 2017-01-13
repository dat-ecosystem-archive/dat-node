var assert = require('assert')
var hyperdrive = require('hyperdrive')
var initArchive = require('./lib/init-archive')
var Dat = require('./dat')

module.exports = createDat

function createDat (dirOrDriveOrDb, opts, cb) {
  assert.ok(typeof dirOrDriveOrDb, 'directory or drive required')
  if (typeof opts === 'function') return createDat(dirOrDriveOrDb, {}, opts)

  // Figure out what first arg is
  if (typeof dirOrDriveOrDb === 'string') opts.dir = dirOrDriveOrDb
  else if (dirOrDriveOrDb instanceof hyperdrive) opts.drive = dirOrDriveOrDb // TODO: will this fail if our hyperdrive vesrion is different?
  else opts.db = dirOrDriveOrDb

  initArchive(opts, function (err, archive, db) {
    if (err) return cb(err)
    cb(null, new Dat(archive, db, opts))
  })
}
