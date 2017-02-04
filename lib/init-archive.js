var assert = require('assert')
var fs = require('fs')
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
  var key = opts.key ? encoding.toBuf(opts.key) : null
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
    drive.core.list(function (err, vals) {
      if (err) return cb(err)
      if (vals.length > 2 && !key) return cb(new Error('Drive has multiple archives. Must specify key.'))
      else if (errorIfExists && vals.length) {
        return db.close(function () {
          cb(new Error('Existing feeds in database.'))
        })
      } else if (vals.length && key && vals.indexOf(key) === -1) {
        return db.close(function () {
          cb(new Error('Existing archive in database does not match key option.'))
        })
      } else if (!vals.length || key) {
        if (!vals.length) debug('No existing feeds in drive')
        if (key) debug('Using key option for archive', key)
        archive = drive.createArchive(key, opts)
        if (archive.key) debug('Archive key', archive.key.toString('hex'))
        archive.resumed = false
        return doneArchive(vals.length < 2 && key) // do not open if new drive and external key (e.g. downloading)
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
