var assert = require('assert')
var hyperdrive = require('hyperdrive')
var initArchive = require('./lib/init-archive')
var Dat = require('./dat')

module.exports = createDat

function createDat (dirOrDrive, opts, cb) {
  assert.ok(dirOrDrive, 'directory or drive required')
  if (typeof opts === 'function') return createDat(dirOrDrive, {}, opts)

  // Figure out what first arg is
  if (typeof dirOrDrive === 'string') opts.dir = dirOrDrive
  else if (dirOrDrive instanceof hyperdrive) opts.drive = dirOrDrive // TODO: will this fail if our hyperdrive vesrion is different?
  else return cb(new Error('first argument must either be a directory or hyperdrive instance'))

  if (drive.location && !opts.dir) opts.dir = drive.location // TODO: I think this is just a multidrive thing
  else if (!opts.dir) return cb(new Error('opts.dir must be specified'))

  initArchive(opts, function (err, archive, db) {
    if (err) return cb(err)
    cb(null, new Dat(archive, db, opts))
  })
}
