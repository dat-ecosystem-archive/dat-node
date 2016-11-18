var assert = require('assert')
var path = require('path')
var extend = require('xtend')
var datDb = require('dat-folder-db')
var encoding = require('dat-encoding')
var hyperdrive = require('hyperdrive')
var raf = require('random-access-file')

module.exports = function (dir, opts, cb) {
  assert.ok(dir, 'lib/init-archive directory required')
  if (typeof opts === 'function') cb = opts

  opts = extend({
    live: true,
    resume: null,
    file: function (name) {
      return raf(path.join(dir, name))
    }
  }, opts)
  opts.key = opts.key
    ? typeof key === 'string'
      ? encoding.decode(opts.key)
      : opts.key
    : null

  if (opts.db) {
    var archive = createArchive(db, opts.key, opts)
    return cb(null, archive, db)
  }

  datDb(dir, opts, function (err, db, key, saveKey) {
    if (err) return cb(err)
    key = key && typeof key === 'string' ? encoding.decode(key) : key

    // TODO: make these clearer (for user and developers)
    if (opts.resume && !key) return cb('No existing archive. \nPlease use create or clone first.')
    if (opts.resume === false && key) return cb(`Archive exists in directory, cannot overwrite. \nExisting key: ${key}`)
    if (key && opts.key && opts.key !== key) return cb('Error: todo')

    var archive = createArchive(db, key || opts.key, opts)

    if (key) return done() // Key already in db
    saveKey(archive.key, function (err) {
      // Saves key back to db for resuming.
      if (err) return cb(err)
      done()
    })

    function done () {
      if (!key && opts.key) {
        // Downloading a new archive (can't archive.open)
        archive.owner = false // TODO: HACK!
        return cb(null, archive, db)
      }
      archive.open(function (err) {
        if (err) return cb(err)
        cb(null, archive, db)
      })
    }
  })

  function createArchive (db, key, opts) {
    var drive = hyperdrive(db)
    var archive = drive.createArchive(key, opts)

    return archive
  }
}
