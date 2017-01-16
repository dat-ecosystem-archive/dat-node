var assert = require('assert')
var path = require('path')
var driveOrCore = require('drive-or-core')
var level = require('level')
var hyperdrive = require('hyperdrive')
var raf = require('random-access-file')
var debug = require('debug')('dat-node')

module.exports = function (opts, cb) {
  assert.ok(opts, 'lib/init-archive opts required')
  assert.ok(opts.dir || opts.drive || opts.db, 'dir, drive, or db option required')
  assert.ok(typeof cb === 'function', 'lib/init-archive callback function required')

  var drive
  var db

  if (opts.db || opts.drive) {
    drive = opts.drive || hyperdrive(opts.db)
    if (!opts.file) {
      opts.file = function (name) {
        return raf(path.join(opts.dir, name))
      }
    }
    db = opts.db ? opts.db : drive.core._db
    return checkDriveKeys()
  }

  var dbPath = path.join(opts.dir, '.dat')

  debug('Making/Reading archive database')
  level(dbPath, function (err, _db) {
    if (err) return cb(err)
    db = _db
    drive = hyperdrive(db)
    checkDriveKeys()
  })

  function checkDriveKeys () {
    drive.core.list(function (err, vals) {
      if (err) return cb(err)
      if (vals.length > 2 && !opts.key) return cb('Drive has multiple archives. Must specify key.')
      if (!vals.length || opts.key) {
        var archive = drive.createArchive(opts.key, opts)
        return doneArchive(archive, false)
      }

      // Two keys, figure out which is metadata
      var feed1 = drive.core.createFeed(vals[0], opts)
      var feed2 = drive.core.createFeed(vals[1], opts)
      driveOrCore(feed1, feed2, function (err, type, key) {
        if (err) return cb(err)
        if (type === 'feed') return cb('Existing archive not found in drive.') // TODO: create new archive?

        var archiveOpts = Object.assign({}, opts)
        archiveOpts.metadata = (key === feed1.key) ? feed1 : feed2 // if true => feed1 is metadata
        archiveOpts.content = (key === feed2.key) ? feed1 : feed2 // if true => feed2 is metadata
        var archive = drive.createArchive(archiveOpts)
        doneArchive(archive)
      })
    })
  }

  function doneArchive (archive, doOpen) {
    // doOpen = false if no existing feeds in drive
    // Opening would have to wait for swarm connection
    if (!doOpen) return cb(null, archive, db)

    archive.resumed = true

    debug('Opening archive')
    archive.open(function (err) {
      debug('Archive opened')
      if (err) return cb(err)
      cb(null, archive, db)
    })
  }
}
