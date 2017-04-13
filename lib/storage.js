var fs = require('fs')
var path = require('path')
// var datSecretStore = require('dat-secret-storage')
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

  // Archive is dir with `.dat` folder storage
  // TODO: what if dir doesn't exist?
  var isDir = fs.statSync(storage).isDirectory()
  if (isDir) {
    return path.join(storage, '.dat')
    // return datSecretStore(path.join(storage, '.dat'))
  }

  // Archive is single file
  // TODO: permanent storage for sharing single file. For now, error.
  throw new Error('Storage must be dir or opts.temp')
}
