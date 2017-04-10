var assert = require('assert')
var path = require('path')
var multicb = require('multicb')
var xtend = require('xtend')
var untildify = require('untildify')
var importFiles = require('./lib/import-files')
var createNetwork = require('./lib/network')
var stats = require('./lib/stats')
var debug = require('debug')('dat-node')

module.exports = Dat

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

Dat.prototype.join =
Dat.prototype.joinNetwork = function (opts, cb) {
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
        live: !self.writable && !opts.end
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

Dat.prototype.leave =
Dat.prototype.leaveNetwork = function (cb) {
  if (!this.network) return
  debug('leaveNetwork()')
  this.archive.unreplicate()
  this.network.leave(this.archive.discoveryKey)
  this.network.destroy(cb)
  delete this.network
}

Dat.prototype.pause = function () {
  debug('pause()')
  this.leave()
}

Dat.prototype.resume = function () {
  debug('resume()')
  this.join()
}

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

Dat.prototype.close = function (cb) {
  cb = cb || noop
  if (this._closed) return cb(new Error('Dat is already closed'))

  var self = this
  self._closed = true
  self.archive.unreplicate()

  var done = multicb()
  closeNet(done())
  closeFileWatch(done())
  closeArchive(done())

  done(cb)

  function closeArchive (cb) {
    self.archive.close(function (err) {
      if (err) return cb(err)
      return cb()
    })
  }

  function closeNet (cb) {
    if (!self.network) return cb()
    self.leave(cb)
  }

  function closeFileWatch (cb) {
    if (!self.importer) return cb()
    self.importer.close()
    process.nextTick(function () {
      // TODO: dat importer close is currently sync-ish
      cb()
    })
  }
}

function noop () { }
