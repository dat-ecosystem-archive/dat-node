var assert = require('assert')
var fs = require('fs')
var xtend = require('xtend')
var hyperdrive = require('hyperdrive')
var encoding = require('dat-encoding')
// var debug = require('debug')('dat-node')
var datStore = require('./lib/storage')
var Dat = require('./dat')

module.exports = createDat

/**
 * Create a Dat instance, archive storage, and ready the archive.
 * @param {string|object} dirOrStorage - Directory or hyperdrive storage object.
 * @param {object} [opts] - Dat-node options and any hyperdrive init options.
 * @param {String|Buffer} [opts.key] - Hyperdrive key
 * @param {Boolean} [opts.createIfMissing = true] - Create storage if it does not exit.
 * @param {Boolean} [opts.errorIfExists = false] - Error if storage exists.
 * @param {Boolean} [opts.temp = false] - Use random-access-memory for temporary storage
 * @param {function(err, dat)} cb - callback that returns `Dat` instance
 * @see defaultStorage for storage information
 */
function createDat (dirOrStorage, opts, cb) {
  if (!cb) {
    cb = opts
    opts = {}
  }
  assert.ok(dirOrStorage, 'dat-node: directory or storage required')
  assert.equal(typeof opts, 'object', 'dat-node: opts should be type object')
  assert.equal(typeof cb, 'function', 'dat-node: callback required')

  var archive
  var key = opts.key ? encoding.toBuf(opts.key) : null
  var storage = datStore(dirOrStorage, opts)
  var createIfMissing = !(opts.createIfMissing === false)
  var errorIfExists = opts.errorIfExists || false
  opts = xtend({
    // TODO: make sure opts.dir is a directory, not file
    dir: (typeof dirOrStorage === 'string') ? dirOrStorage : null
  }, opts)

  // TODO: Use hyperdrive option?
  if (createIfMissing && !errorIfExists) return create()
  checkIfExists()

  /**
   * Check if archive storage folder exists.
   * @private
   */
  function checkIfExists () {
    // TODO: set err type
    var missingError = new Error('Dat storage does not exist.')
    missingError.name = 'MissingError'
    var existsError = new Error('Dat storage already exists.')
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
   * @private
   */
  function create () {
    archive = hyperdrive(storage, key, opts)
    archive.ready(function () {
      if (archive.metadata.has(0) && archive.version) archive.resumed = true

      cb(null, new Dat(archive, opts))
    })
  }
}
