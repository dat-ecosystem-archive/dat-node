var fs = require('fs')
var path = require('path')
var datStore = require('dat-storage')
// var secretStorage = require('dat-secret-storage')
var raf = require('random-access-file')
var ram = require('random-access-memory')

module.exports = defaultStorage

/**
 * Parse the storage argument and return storage for hyperdrive.
 * By default, uses dat-secret-storage to storage secret keys in user's home directory.
 * @param {string|object} storage - Storage for hyperdrive.
 *   `string` is a directory or file. Directory: `/my-data`, storage will be in `/my-data/.dat`.
 *   Single File: `/my-file.zip`, storage will be in memory.
 *   Object is a hyperdrive storage object `{metadata: fn, content: fn}`.
 * @param {object} [opts] - options
 * @param {Boolean} [opts.temp] - Use temporary storage (random-access-memory)
 * @returns {object} hyperdrive storage object
 */
function defaultStorage (storage, opts) {
  // Use custom storage or ram
  if (typeof storage !== 'string') return storage
  if (opts.temp) return ram
  if (opts.latest === false) {
    // Store as SLEEP files inluding content.data
    return {
      metadata: function (name, opts) {
        // I don't think we want this, we may get multiple 'ogd' sources
        // if (name === 'secret_key') return secretStorage()(path.join(storage, 'metadata.ogd'), {key: opts.key, discoveryKey: opts.discoveryKey})
        return raf(path.join(storage, 'metadata.' + name))
      },
      content: function (name, opts) {
        return raf(path.join(storage, 'content.' + name))
      }
    }
  }

  try {
    // Store in .dat with secret in ~/.dat
    if (fs.statSync(storage).isDirectory()) {
      return datStore(storage, opts)
    }
  } catch (e) {
    // Does not exist, make dir
    try {
      fs.mkdirSync(storage)
    } catch (e) {
      // Invalid path
      throw new Error('Invalid storage path')
    }
    return datStore(storage, opts)
  }
  error()

  function error () {
    // TODO: single file sleep storage
    throw new Error('Storage must be dir or opts.temp')
  }
}
