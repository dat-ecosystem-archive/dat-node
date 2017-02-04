var assert = require('assert')
var fs = require('fs')
var path = require('path')
var level = require('level')
var hyperdrive = require('hyperdrive')
var raf = require('random-access-file')
var encoding = require('dat-encoding')
var debug = require('debug')('dat-node')

module.exports = function (opts, cb) {
  assert.ok(opts, 'dat-node: lib/init-archive opts required')
  assert.ok(opts.dir, 'dat-node: lib/init-archive dir option required')
  assert.ok(typeof cb === 'function', 'dat-node: lib/init-archive callback function required')

  var archive
  var drive
  var db
  var dir = opts.dir
  var key = opts.key ? encoding.toStr(opts.key) : null
  var dbPath = opts.dbPath || path.join(dir, '.dat')
  var createIfMissing = opts.createIfMissing === false ? opts.createIfMissing : true
  var errorIfExists = opts.errorIfExists || false

  // opts.resume backwards compat. TODO: Remove in v2
  if (opts.resume) createIfMissing = false
  if (opts.resume === false) errorIfExists = true

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

  if (createIfMissing !== false) return createDb()

  try {
    // check if existing dbPath
    if (!fs.statSync(dbPath).isDirectory()) throw new Error('.dat folder not a dir')
    return createDb()
  } catch (e) {
    return cb(new Error('No existing .dat folder'))
  }

  function createDb () {
    debug('Making/Reading archive database')
    level(dbPath, function (err, _db) {
      if (err) return cb(err)
      db = _db
      drive = hyperdrive(db)
      checkDriveKeys()
    })
  }

  function checkDriveKeys () {
    // Try to resume archives if there are keys in the drive
    debug('Reading existing keys in drive')
    drive.core.list(function (err, keys) {
      if (err) return cb(err)

      if (keys.length > 2 && !key) return cb(new Error('Drive has multiple archives. Must specify key.'))
      else if (errorIfExists && keys.length) {
        return db.close(function () {
          cb(new Error('Existing feeds in database.'))
        })
      }

      keys = keys.map(function (val) {
        return encoding.toStr(val)
      })
      debug(`Drive has ${keys.length} existing keys.`)
      if (keys.length) {
        debug('keys:', keys)
      }

      // Error if opts.key is used and doesn't match anything in database
      if (keys.length && key && keys.indexOf(key) === -1) {
        return db.close(function () {
          cb(new Error('Existing archive in database does not match key option.'))
        })
      }

      if (key) {
        debug('Using key option for archive', key)
        archive = drive.createArchive(key, opts)
        archive.resumed = (keys.length === 2) // resumed = true if existing archive
        return doneArchive(keys.length < 2 && key) // do not open if new drive and external key (e.g. downloading)
      } else if (!keys.length) {
        // create a new database + archive
        debug('No existing feeds in drive, creating new archive.')
        archive = drive.createArchive(null, opts)
        archive.resumed = false
        return doneArchive(false) // open archive - no external key so we are making new archive locally
      }
      // opts.key = null && keys.length === 2
      tryOpen()

      function tryOpen () {
        // Just in case: double check our logic here =)
        assert.ok(!key, 'dat-node: lib/init-archive tryOpen should be called if we opts.key is used')
        assert.ok(keys.length && keys.length <= 2, `dat-node: lib/init-archive tryOpen 1-2 values in database, db has ${keys.length}`)

        // Existing Keys, No key Option
        // Guess which key is metadata
        // If first key fails, use other key
        debug('Making archive with key', keys[keys.length - 1].toString('hex'))
        archive = drive.createArchive(keys[keys.length - 1], opts)
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
      }

      function tryOtherKey () {
        debug('Bad Key. Trying other key.')
        archive = drive.createArchive(keys[0], opts)
        doneArchive()
      }
    })
  }

  function doneArchive (doNotOpen) {
    debug('Archive initialized')
    if (archive.key) debug('Archive key', archive.key.toString('hex'))
    // doNotOpen = true if no existing feeds in drive
    // Opening would have to wait for swarm connection
    if (doNotOpen) return cb(null, archive, db)

    if (archive.resumed !== false) archive.resumed = true

    if (archive.key) debug('Opening archive', archive.key.toString('hex'))
    else debug('Opening snapshot archive')
    archive.open(function (err) {
      if (err) return cb(err)
      debug('Archive opened')
      cb(null, archive, db)
    })
  }
}
