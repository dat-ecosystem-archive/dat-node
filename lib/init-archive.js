var assert = require('assert')
var fs = require('fs')
var path = require('path')
var xtend = require('xtend')
var hyperdrive = require('hyperdrive')
var encoding = require('dat-encoding')
var debug = require('debug')('dat-node')

module.exports = function (opts, cb) {
  assert.ok(opts, 'dat-node: lib/init-archive opts required')
  assert.ok(opts.dir, 'dat-node: lib/init-archive dir option required')
  assert.ok(typeof cb === 'function', 'dat-node: lib/init-archive callback function required')

  var archive
  var dir = opts.dir
  var key = opts.key ? encoding.toStr(opts.key) : null
  var dbPath = opts.dbPath || path.join(dir, '.dat')
  var createIfMissing = !(opts.createIfMissing === false)
  var errorIfExists = opts.errorIfExists || false
  var driveOpts = xtend({}, opts)

  if (opts.db || opts.drive) {
    return create()
    // TODO: what happens to db option?
    // drive = opts.drive || hyperdrive(opts.db)
    // db = opts.db ? opts.db : drive.core._db
    // return finishReady()
  }

  if (createIfMissing !== false) return create()

  try {
    // check if existing dbPath
    // TODO: check for sleep files
    if (!fs.statSync(dbPath).isDirectory()) throw new Error('.dat folder not a dir')
    return create()
  } catch (e) {
    return cb(new Error('No existing .dat folder'))
  }

  function create () {
    archive = opts.drive || hyperdrive(dbPath, key, driveOpts)
    if (archive.metadata.readable && archive.content && archive.content.readable) return done()
    archive.on('ready', done)
  }

  function done () {
    debug('Archive initialized')

    // TODO: if (archive.resumed !== false) archive.resumed = true
    cb(null, archive)
  }
}
