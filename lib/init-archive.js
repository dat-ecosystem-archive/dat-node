var assert = require('assert')
var path = require('path')
var level = require('level')
var hyperdrive = require('hyperdrive')
var raf = require('random-access-file')
var debug = require('debug')('dat-node')
// var driveOrCore = require('drive-or-core')

module.exports = function (opts, cb) {
  assert.ok(opts, 'lib/init-archive opts required')
  assert.ok(opts.dir || opts.drive || opts.db, 'dir, drive, or db option required')
  assert.ok(typeof cb === 'function', 'lib/init-archive callback function required')

  var archive
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
    debug('Reading existing keys in drive')
    drive.core.list(function (err, vals) {
      if (err) return cb(err)
      if (vals.length > 2 && !opts.key) return cb('Drive has multiple archives. Must specify key.')
      else if (!vals.length || opts.key) {
        archive = drive.createArchive(opts.key, opts)
        return doneArchive(!vals.length) // do not open if new drive
      }
      debug(`Drive has ${vals.length} existing keys. Getting archive key.`)

      debug('Making archive with existing key', vals[0].toString('hex'))
      archive = drive.createArchive(vals[0], opts)
      doneArchive()

      // TODO: if we can't assume first key is metadata
      // // Two keys, figure out which is metadata
      // var feed1 = drive.core.createFeed(vals[0], opts)
      // var feed2 = drive.core.createFeed(vals[1], opts)
      // debug('Checking feeds to find metadata')
      // driveOrCore(feed1, feed2, function (err, type, key) {
      //   if (err) return cb(err)
      //   if (type === 'feed') return cb('Existing archive not found in drive.') // TODO: create new archive?

      //   var archiveOpts = Object.assign({}, opts)
      //   archiveOpts.metadata = (key === feed1.key) ? feed1 : feed2 // if true => feed1 is metadata
      //   archiveOpts.content = (key === feed2.key) ? feed1 : feed2 // if true => feed2 is metadata
      // })
    })
  }

  function doneArchive (doNotOpen) {
    debug('Archive created')
    // doNotOpen = true if no existing feeds in drive
    // Opening would have to wait for swarm connection
    if (doNotOpen) return cb(null, archive, db)

    archive.resumed = true

    debug('Opening archive')
    archive.open(function (err) {
      debug('Archive opened')
      if (err) return cb(err)
      cb(null, archive, db)
    })
  }
}
