var events = require('events')
var path = require('path')
var util = require('util')
var encoding = require('dat-encoding')
var hyperdrive = require('hyperdrive')
var createSwarm = require('hyperdrive-archive-swarm')
var raf = require('random-access-file')
var each = require('stream-each')
var thunky = require('thunky')
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
    _datPath: path.join(opts.dir, '.dat'),
    ignore: [/^(?:\/.*)?\.dat(?:\/.*)?$/],
    snapshot: false,
    watchFiles: true,
    discovery: true,
    utp: true,
    webrtc: undefined // false would turn off wrtc even if supported
  }
  if (opts.ignoreHidden !== false) defaultOpts.ignore.push(/[\/\\]\./)
  if (opts.ignore && Array.isArray(opts.ignore)) opts.ignore = opts.ignore.concat(defaultOpts.ignore)
  else if (opts.ignore) opts.ignore = [opts.ignore].concat(defaultOpts.ignore)
  if (typeof opts.upload !== 'undefined' && typeof opts.discovery === 'undefined') opts.discovery = {upload: opts.upload, download: true} // 3.2.0 backwards compat
  opts = extend(defaultOpts, opts) // opts takes priority

  var self = this

  self.options = opts
  self.key = opts.key
    ? typeof key === 'string'
      ? encoding.decode(opts.key)
      : opts.key
    : null
  self.dir = opts.dir === '.' ? process.cwd() : path.resolve(opts.dir)
  if (opts.db) self.db = opts.db
  else self._datPath = opts._datPath
  self.live = opts.key ? null : !opts.snapshot
  if (opts.snapshot) self.options.watchFiles = false // Can't watch snapshot files

  self.stats = {
    filesTotal: 0,
    filesProgress: 0,
    bytesTotal: 0, // archive.content.bytes
    bytesProgress: 0, // file import progress
    blocksTotal: 0, // archive.content.blocks
    blocksProgress: 0, // download progress
    bytesUp: 0, // archive.on('upload', data.length)
    bytesDown: 0, // archive.on('download', data.length)
    peers: 0 // swarm connections
  }

  self.open = thunky(open)

  function open (cb) {
    self._open(cb)
  }

  self._emitError = function (err) {
    if (err) self.emit('error', err)
  }
}

util.inherits(Dat, events.EventEmitter)

Dat.prototype._open = function (cb) {
  if (this._closed) return cb('Cannot open a closed Dat')
  var self = this
  getDb(self, function (err) {
    if (err) return cb(err)
    var drive = hyperdrive(self.db)
    self.archive = drive.createArchive(self.key, {
      live: self.live,
      file: function (name) {
        return raf(path.join(self.dir, name))
      }
    })
    self._opened = true
    cb()
  })
}

Dat.prototype.share = function (cb) {
  if (!this.dir) return cb(new Error('Directory required for share.'))

  var self = this
  if (!self._opened) {
    return self.open(function () {
      self.share(cb)
    })
  }

  var archive = self.archive
  cb = cb || self._emitError

  archive.open(function (err) {
    if (err) return cb(err)

    if (archive.key && !archive.owner) {
      // TODO: allow this but change to download
      return cb('Dat previously downloaded. Run dat ' + encoding.encode(archive.key) + ' to resume')
    }
    self.owner = archive.owner

    if ((archive.live || archive.owner) && archive.key) {
      if (!self.key) self.db.put('!dat!key', archive.key.toString('hex'))
      self._joinSwarm()
      self.key = archive.key
      self.emit('key', archive.key.toString('hex'))
    }

    var importer = self._fileStatus = importFiles(self.archive, self.dir, {
      live: self.options.watchFiles && archive.live,
      resume: self.resume,
      ignore: self.options.ignore
    }, function (err) {
      if (err) return cb(err)
      if (!archive.live || !self.options.watchFiles) return done()
      importer.on('file imported', function (file) {
        if (file.mode === 'created') self.stats.filesTotal++
        self.stats.bytesTotal = archive.content.bytes
        self.emit('archive-updated')
      })
      done()
    })

    importer.on('error', function (err) {
      return cb(err)
    })

    importer.on('file-counted', function (stats) {
      self.emit('file-counted', stats)
    })

    importer.on('files-counted', function (stats) {
      self.stats.filesTotal = stats.filesTotal
      self.stats.bytesTotal = stats.bytesTotal
      self.emit('files-counted', stats)
    })

    importer.on('file imported', function (file) {
      self.stats.filesProgress = importer.fileCount
      self.stats.bytesProgress = importer.totalSize
      self.emit('file-added', file)
    })

    importer.on('file skipped', function (file) {
      self.stats.filesProgress = importer.fileCount
      self.stats.bytesProgress = importer.totalSize
      file.mode = 'skipped'
      self.emit('file-added', file)
    })
  })

  archive.on('upload', function (data) {
    self.stats.bytesUp += data.length
    self.emit('upload', data)
  })

  function done (err) {
    if (err) return cb(err)

    archive.finalize(function (err) {
      if (err) return cb(err)

      if (self.options.snapshot) {
        self._joinSwarm()
        self.key = archive.key
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
  if (!this.key) return cb(new Error('Key required for download.'))
  if (!this.dir) return cb(new Error('Directory required for download.'))

  var self = this
  if (!self._opened) {
    return self.open(function () {
      self.download(cb)
    })
  }

  var archive = self.archive
  cb = cb || self._emitError

  self._joinSwarm()
  self.emit('key', archive.key.toString('hex'))

  archive.open(function (err) {
    if (err) return cb(err)
    self.live = archive.live
    self.owner = archive.owner
    self.db.put('!dat!key', archive.key.toString('hex'))
    updateTotalStats() //  Call once for downloads previously started

    archive.metadata.once('download-finished', updateTotalStats)

    archive.once('download', function () {
      // bytesTotal can be zero even when we have metadata downloaded ^
      updateTotalStats()
    })

    archive.metadata.on('update', function () {
      updateTotalStats() // Updates total on live sync
      self.emit('archive-updated')
    })

    archive.content.on('download-finished', function () {
      updateTotalStats()
      self.emit('download-finished')
    })

    archive.on('download', function (data) {
      self.stats.blocksProgress++
      self.stats.bytesDown += data.length
      self.emit('download', data)
    })

    archive.on('upload', function (data) {
      self.stats.bytesUp += data.length
      self.emit('upload', data)
    })

    each(archive.list({live: archive.live}), function (entry, next) {
      if (archive.isEntryDownloaded(entry)) {
        self.stats.blocksProgress += entry.blocks
        return entryDone(entry, next)
      }
      var downloaded = archive.countDownloadedBlocks(entry)
      self.stats.blocksProgress += downloaded
      archive.download(entry, function (err) {
        // Other blocks are added to stats.blocksProgress with archive.on('download')
        if (err) return cb(err)
        entryDone(entry, next)
      })
    }, function (err) {
      if (err) return cb(err)
      return cb(null)
    })

    function entryDone (entry, cb) {
      if (entry.type === 'file') {
        self.stats.filesProgress++
        self.emit('file-downloaded', entry)
      }
      cb()
    }
  })

  function updateTotalStats () {
    var updateFileCount = archive.content && archive.content.blocks !== self.stats.blocksTotal
    self.stats.bytesTotal = archive.content ? archive.content.bytes : 0
    self.stats.blocksTotal = archive.content ? archive.content.blocks : 0
    if (updateFileCount || !self.stats.filesTotal) {
      var fileCount = 0
      var entries = {}
      each(archive.list({live: false}), function (data, next) {
        // TODO: remove this when we have a "latest" list function w/out duplicates
        if (data.type !== 'file' || entries[data.name]) return next()
        entries[data.name] = {}
        fileCount++
        next()
      }, function () {
        self.stats.filesTotal = fileCount
      })
    }
  }
}

Dat.prototype._joinSwarm = function () {
  var self = this
  if (!self.options.discovery) return
  var discovery = self.options.discovery || {}
  if (typeof self.options.discovery !== 'object') discovery = {upload: true, download: true}

  self.swarm = createSwarm(self.archive, {
    port: self.options.port,
    utp: self.options.utp,
    upload: discovery.upload,
    download: discovery.download,
    signalhub: self.options.signalhub,
    wrtc: self.options.webrtc
  })
  function updatePeers () {
    self.stats.peers = self.swarm.connections
    self.emit('swarm-update')
  }
  self.emit('connecting')
  self.swarm.on('connection', function (peer) {
    updatePeers()
    peer.on('close', updatePeers)
  })
}

Dat.prototype.close = function (cb) {
  if (!cb) cb = noop
  var self = this
  self._closed = true

  closeSwarm(function () {
    closeFileWatcher()
    if (!self.archive) return cb()
    self.archive.close(function () {
      cb()
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

function noop () {}
