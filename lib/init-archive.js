var assert = require('assert')
var path = require('path')
var level = require('level')
var hyperdrive = require('hyperdrive')
var raf = require('random-access-file')
var encoding = require('dat-encoding')
var debug = require('debug')('dat-node')

module.exports = function (opts, cb) {
  assert.ok(opts, 'lib/init-archive opts required')
  assert.ok(opts.dir, 'dir option required')
  assert.ok(typeof cb === 'function', 'lib/init-archive callback function required')

  var archive
  var drive
  var db
  var dir = opts.dir
  var dbPath = opts.dbPath || path.join(dir, '.dat')

  if (!opts.file) {
    // TODO: do we always want this set?
    opts.file = function (name, opts) {
      return raf(path.join(dir, name), opts && typeof opts.length === 'number' && {length: opts.length})
    }
  }

  if (opts.db || opts.drive) {
    drive = opts.drive || hyperdrive(opts.db)
    db = opts.db ? opts.db : drive.core._db
    return checkDriveKeys()
  }

  debug('Making/Reading archive database')
  level(dbPath, function (err, _db) {
    if (err) return cb(err)
    db = _db
    drive = hyperdrive(db)
    checkDriveKeys()
  })

  function checkDriveKeys () {
    // Try to resume archives if there are keys in the drive
    debug('Reading existing keys in drive')
    drive.core.list(function (err, vals) {
      if (err) return cb(err)
      if (vals.length > 2 && !opts.key) return cb('Drive has multiple archives. Must specify key.')
      else if (!vals.length || opts.key) {
        if (!vals.length) debug('No existing feeds in drive')
        if (opts.key) debug('Resuming using key option', opts.key)
        if (opts.key && typeof opts.key === 'string') opts.key = encoding.toBuf(opts.key)
        archive = drive.createArchive(opts.key, opts)
        return doneArchive(!vals.length) // do not open if new drive
      }
      debug(`Drive has ${vals.length} existing keys. Getting archive key.`)

      // Try to guess metadata and maybe fail
      debug('Making archive with key', vals[vals.length - 1].toString('hex'))
      archive = drive.createArchive(vals[vals.length - 1], opts)
      var openTimeout = setTimeout(function () {
        debug('Timeout Open')
        tryOtherKey()
      }, 150)
      archive.open(function (err) {
        clearTimeout(openTimeout)
        if (!err) return doneArchive()
        var badKey = err && (err.message.indexOf('Unknown message type') > -1 || err.message.indexOf('Key not found in database') > -1)
        if (err & !badKey) return cb(err)
        tryOtherKey()
      })

      function tryOtherKey () {
        debug('Bad Key. Trying other key.')
        archive = drive.createArchive(vals[0], opts)
        doneArchive()
      }
    })
  }

  function doneArchive (doNotOpen) {
    debug('Archive created')
    // doNotOpen = true if no existing feeds in drive
    // Opening would have to wait for swarm connection
    if (doNotOpen) return cb(null, archive, db)

    archive.resumed = true

    debug('Opening archive', archive.key.toString('hex'))
    archive.open(function (err) {
      if (err) return cb(err)
      debug('Archive opened')
      cb(null, archive, db)
    })
  }
}
