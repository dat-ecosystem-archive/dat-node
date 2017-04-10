var assert = require('assert')
var fs = require('fs')
var path = require('path')
var xtend = require('xtend')
var hyperdrive = require('hyperdrive')
var encoding = require('dat-encoding')
var datStore = require('dat-secret-storage')
var ram = require('random-access-memory')
// var debug = require('debug')('dat-node')
var Dat = require('./dat')

module.exports = createDat

function createDat (dirOrDrive, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }
  assert.ok(typeof dirOrStorage === 'string' || typeof dirOrStorage === 'object', 'dat-node: dirOrStorage should be string or object')
  assert.equal(typeof opts, 'object', 'dat-node: opts should be type object')
  assert.equal(typeof cb, 'function', 'dat-node: callback required')

  var archive
  var dir
  var isDir = false
  var key = opts.key ? encoding.toBuf(opts.key) : null
  var storage = defaultStorage(dirOrStorage)
  var createIfMissing = !(opts.createIfMissing === false)
  var errorIfExists = opts.errorIfExists || false
  opts = xtend({
    dir: dir
  }, opts)

  // TODO: Use hyperdrive option?
  if (createIfMissing && !errorIfExists) return create()
  checkIfExists()

  /**
   * Check if archive storage folder exists.
   */
  function checkIfExists () {
    // TODO: set err type
    var missingError = new Error('Dat storage does not exist.')
    missingError.name = 'MissingError'
    var existsError = new Error('Dat storage a;ready exists.')
    existsError.name = 'ExistsError'

    try {
      // check if storage path exists
      fs.stat(storage, function (err, stat) {
        // TODO: check for sleep files
        if (err || !stat.isDirectory()) return cb(missingError)
        if (errorIfExists) return cb(existsError)
        return create()
      })
    } catch (e) {
      return cb(missingError)
    }
  }

  /**
   * Create the archive and call `archive.ready()` before callback.
   * Set `archive.resumed` if archive has a content feed.
   */
  function create () {
    archive = hyperdrive(storage, key, opts)
    archive.ready(function () {
      // TODO: make sure this is accurate
      if (archive.metadata.has(0)) archive.resumed = true

      cb(null, new Dat(archive, opts))
    })
  }

  /**
   * Parse the storage argument and return storage for hyperdrive.
   * By default, uses dat-secret-storage to storage secret keys in user's home directory.
   * @param {string|object} dirOrStorage - Storage for hyperdrive.
   *   `string` is a directory or file. Directory: `/my-data`, storage will be in `/my-data/.dat`.
   *   Single File: `/my-file.zip`, storage will be in memory.
   *   Object is a hyperdrive storage object `{metadata: fn, content: fn}`.
   * @returns {object} hyperdrive storage object
   */
  function defaultStorage (dirOrStorage) {
    // Use custom storage or ram
    if (typeof dirOrStorage !== 'string') return dirOrStorage
    if (opts.temp) return ram

    // Archive is dir with `.dat` folder storage
    // TODO: what if dir doesn't exist?
    isDir = fs.statSync(dirOrStorage).isDirectory()
    if (isDir) {
      dir = dirOrStorage
      return datStore(path.join(dirOrStorage, '.dat'))
    }

    // Archive is single file
    // TODO: permanent storage for sharing single file. For now, error.
    return cb(new Error('Storage must be dir or opts.temp'))
  }
}
