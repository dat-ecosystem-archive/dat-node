var fs = require('fs')
var path = require('path')
var datStore = require('dat-storage')
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
    if (typeof storage === 'string') return storage

    throw new Error('TODO')
    // TODO
    // return {
    //   metadata: function (name, opts) {
    //     // I don't think we want this, we may get multiple 'ogd' sources
    //     // if (name === 'secret_key') return secretStorage()(path.join(storage, 'metadata.ogd'), {key: opts.key, discoveryKey: opts.discoveryKey})
    //     return raf(path.join(storage, 'metadata.' + name))
    //   },
    //   content: function (name, opts) {
    //     return raf(path.join(storage, 'content.' + name))
    //   }
    // }
  }

  try {
    // TODO secret key storage
    //
    // Store in .dat with secret in ~/.dat
    var dir = path.join(storage, '.dat')
    if (fs.statSync(dir).isDirectory()) {
      return dir
    }
  } catch (e) {
    // Does not exist, make dir
    try {
      fs.mkdirSync(dir)
    } catch (e) {
      // Invalid path
      throw new Error('Invalid storage path')
    }
    return dir
  }
  error()

  function error () {
    // TODO: single file sleep storage
    throw new Error('Storage must be dir or opts.temp')
  }
}
