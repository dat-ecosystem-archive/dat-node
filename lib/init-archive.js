var assert = require('assert')
var path = require('path')
var hyperdrive = require('hyperdrive')
var raf = require('random-access-file')
var folderArchive = require('dat-folder-archive')

module.exports = function (dir, opts, cb) {
  assert.ok(dir, 'lib/init-archive directory required')
  assert.ok(opts, 'lib/init-archive opts required')
  assert.ok(typeof cb === 'function', 'lib/init-archive callback function required')

  if (opts.db) {
    var drive = hyperdrive(opts.db)
    if (!opts.file) {
      opts.file = function (name) {
        return raf(path.join(dir, name))
      }
    }
    var archive = drive.createArchive(opts.key, opts)
    return cb(null, archive, opts.db)
  }

  folderArchive(dir, opts, function (err, archive, db) {
    if (err) return cb(err)
    if (opts.key && !archive.resume) {
      // Downloading a new archive (can't archive.open)
      archive.owner = false // TODO: HACK!
      return cb(null, archive, db)
    }
    archive.open(function (err) {
      if (err) return cb(err)
      cb(null, archive, db)
    })
  })
}
