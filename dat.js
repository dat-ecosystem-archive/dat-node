var assert = require('assert')
var path = require('path')
var multicb = require('multicb')
var importFiles = require('./lib/import-files')
var createNetwork = require('./lib/network')
var stats = require('./lib/stats')

module.exports = Dat

function Dat (archive, db, opts) {
  if (!(this instanceof Dat)) return new Dat(archive, db, opts)
  if (typeof opts === 'undefined') return Dat(archive, null, db)
  assert.ok(archive, 'archive required')
  // assert.ok(db, 'database required') // maybe not be required for multidrive...
  assert.ok(opts.dir, 'opts.directory required')

  this.path = path.resolve(opts.dir)
  this.options = opts

  this.archive = archive
  this.db = db

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
    owner: {
      enumerable: true,
      get: function () {
        return self.archive.owner
      }
    },
    resumed: {
      enumerable: true,
      get: function () {
        return self.archive.resumed
      }
    }
  })
}

Dat.prototype.join =
Dat.prototype.joinNetwork = function (opts) {
  if (this.network) return this.network.join(this.archive.discoveryKey)
  var self = this

  var network = self.network = createNetwork(self.archive, opts)
  self.options.network = network.options

  network.swarm = network // 1.0 backwards compat. TODO: Remove in v2
  if (self.owner) return network

  network.once('connection', function () {
    // automatically open archive and set exposed values
    self.archive.open(noop)
  })
  return network
}

Dat.prototype.leave =
Dat.prototype.leaveNetwork = function () {
  if (!this.network) return
  this.network.leave(this.archive.discoveryKey)
}

Dat.prototype.trackStats = function (opts) {
  opts = opts || {}
  assert.ok(opts.db || this.db, 'Dat needs database to track stats')
  this.stats = stats(this.archive, opts.db || this.db)
  return this.stats
}

Dat.prototype.importFiles = function (target, opts, cb) {
  if (typeof target !== 'string') return this.importFiles('', target, opts)
  if (typeof opts === 'function') return this.importFiles(target, {}, opts)
  if (!this.archive.owner) return cb(new Error('Must be archive owner to import files.'))

  var self = this
  target = target && target.length ? target : self.path
  if (target === self.path && opts.indexing !== false) opts.indexing = true

  self.importer = importFiles(self.archive, target, opts, function (err) {
    if (err || self.archive.live) return cb(err)
    // Finalize snapshot
    self.archive.finalize(function (err) {
      if (err) return cb(err)
      // TODO: write snapshot key to file
      cb(null)
    })
  })
  self.options.importer = self.importer.options
  return self.importer
}

Dat.prototype.close = function (cb) {
  cb = cb || noop
  if (this._closed) return cb(new Error('Dat is already closed'))

  var self = this
  self.leave()

  var done = multicb()
  closeNet(done())
  closeFileWatch(done())

  done(function (err) {
    if (err) return cb(err)
    self._closed = true
    cb()
  })

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
    self.network.close(cb)
  }

  function closeFileWatch (cb) {
    if (!self.importer) return cb()
    self.importer.close()
    cb() // TODO: dat importer close is currently sync-ish
  }
}

function noop () { }
