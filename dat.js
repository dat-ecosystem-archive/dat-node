var assert = require('assert')
var path = require('path')
var multicb = require('multicb')
var xtend = require('xtend')
var untildify = require('untildify')
var importFiles = require('./lib/import-files')
var createNetwork = require('./lib/network')
var stats = require('./lib/stats')
var serveHttp = require('./lib/serve')
var debug = require('debug')('dat-node')

module.exports = Dat

/**
 * @class Dat
 * @type {Object}
 * @param {Object} archive - Hyperdrive archive
 * @param {Object} [opts] - Options
 * @param {String} [opts.dir] - Directory of archive
 *
 * @property {Object} archive - Hyperdrive Archive
 * @property {String} path - Resolved path of archive
 * @property {Buffer} key - Archive Key (`archive.key`)
 * @property {Boolean} live - Archive is live (`archive.live`)
 * @property {Boolean} writable - Archive is writable (`archive.metadata.writable`)
 * @property {Boolean} version - Archive version (`archive.version`)
 * @property {Object} options - Initial options and all options passed to childen functions.
 * @returns {Object} Dat
 */
function Dat (archive, opts) {
  if (!(this instanceof Dat)) return new Dat(archive, opts)
  assert.ok(archive, 'archive required')
  var self = this

  this.archive = archive
  this.options = xtend(opts)
  if (opts.dir) {
    this.path = path.resolve(untildify(opts.dir))
  }

  // Getters for convenience accessors
  Object.defineProperties(this, {
    key: {
      enumerable: true,
      get: function () {
        return self.archive.key
      }
    },
    live: {
      enumerable: true,
      get: function () {
        return self.archive.live
      }
    },
    resumed: {
      enumerable: true,
      get: function () {
        return self.archive.resumed
      }
    },
    writable: {
      enumerable: true,
      get: function () {
        return self.archive.metadata.writable
      }
    },
    version: {
      enumerable: true,
      get: function () {
        return self.archive.version
      }
    }
  })
}

/**
 * Join Dat Network via Hyperdiscovery
 * @type {Function}
 * @param {Object} [opts] - Network options, passed to hyperdiscovery.
 * @param {Function} [cb] - Callback after first round of discovery is finished.
 * @returns {Object} Discovery Swarm Instance
 */
Dat.prototype.joinNetwork =
Dat.prototype.join = function (opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  var self = this
  if (!opts && self.options.network) opts = self.options.network // use previous options
  else opts = opts || {}
  cb = cb || noop

  var netOpts = xtend({
    stream: function (peer) {
      var stream = self.archive.replicate({
        upload: !(opts.upload === false),
        download: !self.writable && opts.download,
        live: !opts.end
      })
      stream.on('close', function () {
        debug('Stream close')
      })
      stream.on('error', function (err) {
        debug('Replication error:', err.message)
      })
      stream.on('end', function () {
        self.downloaded = true
        debug('Replication stream ended')
      })
      return stream
    }
  }, opts)

  var network = self.network = createNetwork(self.archive, netOpts, cb)
  self.options.network = netOpts

  return network
}

/**
 * Leave Dat Network
 * @type {Function}
 * @param {Function} [cb] - Callback after network is closed
 */
Dat.prototype.leaveNetwork =
Dat.prototype.leave = function (cb) {
  if (!this.network) return
  debug('leaveNetwork()')
  // TODO: v8 unreplicate ?
  // this.archive.unreplicate()
  this.network.leave(this.archive.discoveryKey)
  this.network.destroy(cb)
  delete this.network
}

/**
 * Pause Dat Network
 * @type {Function}
 */
Dat.prototype.pause = function () {
  debug('pause()')
  this.leave()
}

/**
 * Resume Dat Network
 * @type {Function}
 */
Dat.prototype.resume = function () {
  debug('resume()')
  this.join()
}

/**
 * Track archive stats
 * @type {Function}
 */
Dat.prototype.trackStats = function (opts) {
  opts = xtend({}, opts)
  this.stats = stats(this.archive, opts)
  return this.stats
}

/**
 * Import files to archive via mirror-folder
 * @type {Function}
 * @param {String} [src=dat.path] - Directory or File to import to `archive`.
 * @param {Function} [cb] - Callback after import is finished
 * @param {Object} [opts] - Options passed to `mirror-folder` and `dat-ignore`
 * @returns {Object} - Import progress
 */
Dat.prototype.importFiles = function (src, opts, cb) {
  if (!this.writable) throw new Error('Must be archive owner to import files.')
  if (typeof src !== 'string') return this.importFiles('', src, opts)
  if (typeof opts === 'function') return this.importFiles(src, {}, opts)

  var self = this
  src = src && src.length ? src : self.path
  opts = xtend({
    indexing: (opts && opts.indexing) || (src === self.path)
  }, opts)

  self.importer = importFiles(self.archive, src, opts, cb)
  self.options.importer = self.importer.options
  return self.importer
}

/**
 * Serve archive over http
 * @type {Function}
 * @param {Object} [opts] - Options passed to `mirror-folder` and `dat-ignore`
 * @returns {Object} - node http server instance
 */
Dat.prototype.serveHttp = function (opts) {
  this.server = serveHttp(this.archive, opts)
  return this.server
}

/**
 * Close Dat archive and other things
 * @type {Function}
 * @param {Function} [cb] - Callback after all items closed
 */
Dat.prototype.close = function (cb) {
  cb = cb || noop
  if (this._closed) return cb(new Error('Dat is already closed'))

  var self = this
  self._closed = true

  var done = multicb()
  closeNet(done())
  closeFileWatch(done())
  closeArchive(done())

  done(cb)

  function closeArchive (cb) {
    // self.archive.unreplicate()
    self.archive.close(cb)
  }

  function closeNet (cb) {
    if (!self.network) return cb()
    self.leave(cb)
  }

  function closeFileWatch (cb) {
    if (!self.importer) return cb()
    self.importer.destroy()
    process.nextTick(cb)
  }
}

function noop () { }
