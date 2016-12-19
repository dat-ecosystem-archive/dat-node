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
    var archive = drive.createArchive(opts.key, {
      file: opts.file,
      live: opts.live,
      sparse: opts.sparse
    })
    return cb(null, archive, opts.db)
  }

  folderArchive(dir, opts, function (err, archive, db) {
    if (err) return cb(err)

    if (opts.key) {
      // Downloading an archive (archive.open not reliable)
      // TODO: better way to handle open for resume?
      if (!archive.owner) archive.owner = false // TODO: HACK!
      return cb(null, archive, db)
    }
    archive.open(function (err) {
      if (err) return cb(err)
      cb(null, archive, db)
    })
  })
}
