var assert = require('assert')
var fs = require('fs')
var path = require('path')
var xtend = require('xtend')
var hyperdrive = require('hyperdrive')
var encoding = require('dat-encoding')
var debug = require('debug')('dat-node')
var keyStore = require('./storage')

module.exports = function (opts, cb) {
  assert.ok(opts, 'dat-node: lib/init-archive opts required')
  assert.ok(opts.dir, 'dat-node: lib/init-archive dir option required')
  assert.ok(typeof cb === 'function', 'dat-node: lib/init-archive callback function required')

  var archive
  var dir = opts.dir
  var key = opts.key ? encoding.toStr(opts.key) : null
  var storageOpts = { archive: null, dir: path.join(dir, '.dat') }
  var storage = opts.storage || keyStore(storageOpts)
  var createIfMissing = !(opts.createIfMissing === false)
  var errorIfExists = opts.errorIfExists || false
  var driveOpts = xtend({}, opts)

  if (opts.drive || opts.storage) return create()
  if (createIfMissing !== false) return create()

  try {
    // check if storage path exists
    // TODO: check for sleep files
    if (!fs.statSync(storage).isDirectory()) throw new Error('.dat folder not a dir')
    return create()
  } catch (e) {
    return cb(new Error('No existing .dat folder'))
  }

  function create () {
    archive = opts.drive || hyperdrive(storage, key, driveOpts)
    storageOpts.archive = archive
    archive.ready(done)
  }

  function done () {
    debug('Archive initialized', archive)

    // TODO: make sure this is accurate
    if (archive.metadata.has(0)) archive.resumed = true
    cb(null, archive)
  }
}
