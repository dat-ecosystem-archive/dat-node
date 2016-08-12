var events = require('events')
var path = require('path')
var util = require('util')
var encoding = require('dat-encoding')
var hyperdrive = require('hyperdrive')
var createSwarm = require('hyperdrive-archive-swarm')
var raf = require('random-access-file')
var speedometer = require('speedometer')
var each = require('stream-each')
var extend = require('xtend')
var importFiles = require('./lib/count-import')
var getDb = require('./lib/db')

module.exports = Dat

function Dat (opts) {
  if (!(this instanceof Dat)) return new Dat(opts)
  if (!opts) opts = {}
  if (!opts.dir) throw new Error('dir option required')
  events.EventEmitter.call(this)

  var defaultOpts = {
    datPath: path.join(opts.dir, '.dat'),
    snapshot: false,
    utp: true,
    ignore: [/\.dat\//],
    swarm: null,
    discovery: true,
    watchFiles: true
  }
  opts = extend(defaultOpts, opts) // opts takes priority

  var self = this

  self.opts = opts
  self.key = opts.key ? encoding.decode(opts.key) : null
  self.dir = opts.dir === '.' ? process.cwd() : path.resolve(opts.dir)
  if (opts.db) self.db = opts.db
  else self.datPath = opts.datPath
  self.snapshot = opts.snapshot
  self.port = opts.port
  self.utp = opts.utp
  self.ignore = opts.ignore
  self.swarm = opts.swarm
  self.discovery = opts.discovery
  self.watchFiles = opts.watchFiles
  if (self.snapshot) self.watchFiles = false // Can't watch snapshot files

  self.stats = {
    filesTotal: 0,
    filesProgress: 0,
    bytesTotal: 0,
    bytesProgress: 0,
    bytesUp: 0,
    bytesDown: 0,
    rateUp: speedometer(),
    rateDown: speedometer()
  }

  getDb(self, function (err) {
    if (err) return self._emitError(err)
    var drive = hyperdrive(self.db)
    var isLive = opts.key ? null : !self.snapshot // need opts.key here. self.key may be populated for resume share
    self.archive = drive.createArchive(self.key, {
      live: isLive,
      file: function (name) {
        return raf(path.join(self.dir, name))
      }
    })
    self.emit('ready')
  })

  self._emitError = function (err) {
    if (err) self.emit('error', err)
  }
}

util.inherits(Dat, events.EventEmitter)

Dat.prototype.share = function (cb) {
  if (!this.dir) cb(new Error('Directory required for share.'))
  var self = this
  var archive = self.archive

  cb = cb || self._emitError

  archive.open(function (err) {
    if (err) return cb(err)

    if (archive.key && !archive.owner) {
      // TODO: allow this but change to download
      cb('Dat previously downloaded. Run dat ' + encoding.encode(archive.key) + ' to resume')
    }

    if ((archive.live || archive.owner) && archive.key) {
      if (!self.key) self.db.put('!dat!key', archive.key.toString('hex'))
      if (self.discovery) self._joinSwarm()
      self.emit('key', archive.key.toString('hex'))
    }

    var importer = self._fileStatus = importFiles(self.archive, self.dir, {
      live: self.watchFiles && archive.live,
      resume: self.resume,
      ignore: self.ignore
    }, function (err) {
      if (err) return cb(err)
      if (!archive.live) return done()
      importer.on('file imported', function (path, mode) {
        self.emit('archive-updated')
      })
      done()
    })

    importer.on('error', function (err) {
      return cb(err)
    })

    importer.on('file-counted', function () {
      self.emit('file-counted')
    })

    importer.on('files-counted', function (stats) {
      self.stats.filesTotal = stats.filesTotal
      self.stats.bytesTotal = stats.bytesTotal
    })

    importer.on('file imported', function (path, mode) {
      self.stats.filesProgress = importer.fileCount
      self.stats.bytesProgress = importer.totalSize
      self.emit('file-added')
    })

    importer.on('file skipped', function (path) {
      self.stats.filesProgress = importer.fileCount
      self.stats.bytesProgress = importer.totalSize
      self.emit('file-added')
    })
  })

  archive.on('upload', function (data) {
    self.stats.bytesUp += data.length
    self.stats.rateUp(data.length)
    self.emit('upload', data)
  })

  function done (err) {
    if (err) return cb(err)

    archive.finalize(function (err) {
      if (err) return cb(err)

      if (self.snapshot) {
        if (self.discovery) self._joinSwarm()
        self.emit('key', archive.key.toString('hex'))
      }

      self.db.put('!dat!finalized', true, function (err) {
        if (err) return cb(err)
        self.emit('archive-finalized')
        cb(null)
      })
    })
  }
}

Dat.prototype.download = function (cb) {
  if (!this.key) cb('Key required for download.')
  if (!this.dir) cb('Directory required for download.')
  var self = this
  var archive = self.archive

  cb = cb || self._emitError

  if (self.discovery) self._joinSwarm()
  self.emit('key', archive.key.toString('hex'))

  archive.open(function (err) {
    if (err) return cb(err)
    if (!archive.live) self.snapshot = true
    self.db.put('!dat!key', archive.key.toString('hex'))

    archive.metadata.once('download-finished', updateTotalStats)

    archive.content.on('download-finished', function () {
      if (self.stats.bytesTotal === 0) updateTotalStats() // TODO: why is this getting here with 0
      self.emit('download-finished')
      if (self.snapshot) cb(null)
    })

    each(archive.list({live: archive.live}), function (data, next) {
      var startBytes = self.stats.bytesProgress
      archive.download(data, function (err) {
        if (err) return cb(err)
        self.stats.filesProgress += 1
        if (startBytes === self.stats.bytesProgress) {
          // TODO: better way to measure progress with existing files
          self.stats.bytesProgress += data.length
        }
        // if (self.stats.filesProgress === self.stats.filesTotal) self.emit('download-finished')
        next()
      })
    }, function (err) {
      if (err) return cb(err)
      cb(null)
    })
  })

  archive.metadata.on('update', function () {
    updateTotalStats()
    self.emit('archive-updated')
  })

  archive.once('download', function () {
    // TODO: fix https://github.com/maxogden/dat/issues/502
    if (self.stats.bytesTotal === 0) updateTotalStats()
  })

  archive.on('download', function (data) {
    self.stats.bytesProgress += data.length
    self.stats.bytesDown += data.length
    self.stats.rateDown(data.length)
    self.emit('download', data)
  })

  archive.on('upload', function (data) {
    self.stats.bytesUp += data.length
    self.stats.rateUp(data.length)
    self.emit('upload', data)
  })

  function updateTotalStats () {
    self.stats.filesTotal = archive.metadata.blocks - 1 // first block is header.
    self.stats.bytesTotal = archive.content ? archive.content.bytes : 0
  }
}

Dat.prototype._joinSwarm = function () {
  var self = this
  self.swarm = createSwarm(self.archive, {port: self.port, utp: self.utp})
  self.emit('connecting')
  self.swarm.on('connection', function (peer) {
    self.emit('swarm-update')
    peer.on('close', function () {
      self.emit('swarm-update')
    })
  })
}

Dat.prototype.close = function (cb) {
  var self = this
  self.archive.close(function () {
    self.db.close(function () {
      closeSwarm(function () {
        closeFileWatcher()
        if (cb) cb()
      })
    })
  })

  function closeFileWatcher () {
    // TODO: add CB
    if (self._fileStatus) self._fileStatus.close()
  }

  function closeSwarm (cb) {
    if (!self.swarm) return cb()
    self.swarm.close(cb)
  }
}
