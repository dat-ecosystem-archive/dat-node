var assert = require('assert')
var fs = require('fs')
var path = require('path')
var hyperdrive = require('hyperdrive')
var resolveDatLink = require('dat-link-resolve')
var debug = require('debug')('dat-node')
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
 * @see defaultStorage for storage information
 */
async function createDat (dirOrStorage, opts) {
  if (!opts) opts = {}
  assert.ok(dirOrStorage, 'dat-node: directory or storage required')
  assert.strictEqual(typeof opts, 'object', 'dat-node: opts should be type object')

  var archive
  var key = opts.key
  var dir = (typeof dirOrStorage === 'string') ? dirOrStorage : null
  var storage = datStore(dirOrStorage, opts)
  var createIfMissing = !(opts.createIfMissing === false)
  var errorIfExists = opts.errorIfExists || false
  var hasDat = false
  opts = Object.assign({
    // TODO: make sure opts.dir is a directory, not file
    dir: dir,
    latest: true
  }, opts)

  return new Promise(async (resolve, reject) => {
    try {
      await checkIfExists()
      const dat = await create()
      return resolve(dat)
    } catch (e) {
      reject(e)
    }
  })

  async function checkIfExists () {
    if (!opts.dir) return

    // Create after we check for pre-sleep .dat stuff
    var createAfterValid = (createIfMissing && !errorIfExists)

    var missingError = new Error('Dat storage does not exist.')
    missingError.name = 'MissingError'
    var existsError = new Error('Dat storage already exists.')
    existsError.name = 'ExistsError'
    var oldError = new Error('Dat folder contains incompatible metadata. Please remove your metadata (rm -rf .dat).')
    oldError.name = 'IncompatibleError'

    return new Promise((resolve, reject) => {
      fs.readdir(path.join(opts.dir, '.dat'), function (err, files) {
        // TODO: omg please make this less confusing.
        var noDat = !!(err || !files.length)
        hasDat = !noDat
        var validSleep = (files && files.length && files.indexOf('metadata.key') > -1)
        var badDat = !(noDat || validSleep)

        if ((noDat || validSleep) && createAfterValid) return resolve()
        else if (badDat) return reject(oldError)

        if (err && !createIfMissing) return reject(missingError)
        else if (!err && errorIfExists) return reject(existsError)
        resolve()
      })
    })
  }

  async function create () {
    if (dir && !opts.temp && !key && (opts.indexing !== false)) {
      // Only set opts.indexing if storage is dat-storage
      // TODO: this should be an import option instead, https://github.com/mafintosh/hyperdrive/issues/160
      opts.indexing = true
    }

    return new Promise(async (resolve, reject) => {
      if (!key) return createArchive()

      resolveDatLink(key, function (err, resolvedKey) {
        if (err) return err
        key = resolvedKey
        createArchive()
      })

      function createArchive () {
        archive = hyperdrive(storage, key, opts)
        archive.on('error', (err) => {
          reject(err)
        })
        archive.ready(function () {
          debug('archive ready. version:', archive.version)
          if (hasDat || (archive.metadata.has(0) && archive.version)) {
            archive.resumed = true
          } else {
            archive.resumed = false
          }
          resolve(Dat(archive, opts))
        })
      }
    })
  }
}
