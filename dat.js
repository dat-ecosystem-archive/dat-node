var assert = require('assert')
var path = require('path')
var multicb = require('multicb')
var xtend = require('xtend')
var importFiles = require('./lib/import-files')
var createNetwork = require('./lib/network')
var stats = require('./lib/stats')
var debug = require('debug')('dat-node')

module.exports = Dat

function Dat (archive, opts) {
  if (!(this instanceof Dat)) return new Dat(archive, opts)
  assert.ok(archive, 'archive required')
  assert.ok(opts.dir, 'opts.directory required')

  this.path = path.resolve(opts.dir)
  this.options = xtend(opts)

  this.archive = archive

  var self = this

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
        debug('replication stream ended')
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
  opts = opts || {}
  // assert.ok(opts.db || this.db, 'Dat needs database to track stats')
  this.stats = stats(this.archive, opts.db || this.db)
  return this.stats
}

Dat.prototype.importFiles = function (target, opts, cb) {
  if (!this.archive.metadata.writable) throw new Error('Must be archive owner to import files.')
  if (typeof target !== 'string') return this.importFiles('', target, opts)
  if (typeof opts === 'function') return this.importFiles(target, {}, opts)

  var self = this
  target = target && target.length ? target : self.path
  opts = xtend({
    indexing: opts && opts.indexing || (target === self.path)
  }, opts)

  self.importer = importFiles(self.archive, target, opts, cb)
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
  closeArchiveDb(done())

  done(cb)

  function closeArchiveDb (cb) {
    self.archive.close(function (err) {
      if (err) return cb(err)
      if (self.options.db || !self.db) return cb(null)
      closeDb(cb)
    })
  }

  function closeDb (cb) {
    if (!self.db) return cb()
    self.db.close(cb)
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
