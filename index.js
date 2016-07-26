var events = require('events')
var path = require('path')
var util = require('util')
var encoding = require('dat-encoding')
var hyperdrive = require('hyperdrive')
var createSwarm = require('hyperdrive-archive-swarm')
var raf = require('random-access-file')
var speedometer = require('speedometer')
var each = require('stream-each')
var append = require('./lib/append')
var getDb = require('./lib/db')

module.exports = Dat

function Dat (opts) {
  if (!(this instanceof Dat)) return new Dat(opts)
  if (!opts) opts = {}
  events.EventEmitter.call(this)

  var self = this

  self.key = opts.key ? encoding.decode(opts.key) : null
  self.dir = opts.dir === '.' ? process.cwd() : opts.dir
  if (opts.db) self.db = opts.db
  else self.datPath = opts.datPath || path.join(self.dir, '.dat')
  self.snapshot = opts.snapshot
  self.port = opts.port
  self.ignore = ignore
  self.swarm = null
  this.stats = {
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
    if (err) return self.emit('error', err)
    var drive = hyperdrive(self.db)
    var isLive = opts.key ? null : !opts.snapshot
    self.archive = drive.createArchive(self.key, {
      live: isLive,
      file: function (name) {
        return raf(path.join(self.dir, name))
      }
    })
    self.emit('ready')
  })
}

util.inherits(Dat, events.EventEmitter)

Dat.prototype.share = function (cb) {
  if (!this.dir) cb(new Error('Directory required for share.'))
  var self = this
  var archive = self.archive

  archive.open(function (err) {
    if (err) return cb(err)

    if (archive.key && !archive.owner) {
      // TODO: allow this but change to download
      cb('Dat previously downloaded. Run dat ' + encoding.encode(archive.key) + ' to resume')
    }

    if ((archive.live || archive.owner) && archive.key) {
      if (!self.key) self.db.put('!dat!key', archive.key.toString('hex'))
      self.joinSwarm()
      self.emit('key', encoding.encode(archive.key))
    }

    append.initialAppend(self, done)
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
        self.joinSwarm()
        self.emit('key', encoding.encode(archive.key))
        self.emit('archive-finalized')
        self.db.put('!dat!finalized', true, cb)
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

  self.joinSwarm()
  self.emit('key', encoding.encode(self.key))

  archive.open(function (err) {
    if (err) return cb(err)
    self.db.put('!dat!key', archive.key.toString('hex'))
    updateTotalStats()

    each(archive.list({live: archive.live}), function (data, next) {
      var startBytes = self.stats.bytesProgress
      archive.download(data, function (err) {
        if (err) return cb(err)
        self.stats.filesProgress += 1
        self.emit('file-downloaded', data)
        if (startBytes === self.stats.bytesProgress) self.stats.bytesProgress += data.length // file already exists
        if (self.stats.filesProgress === self.stats.filesTotal) self.emit('download-finished')
        else next()
      })
    }, function (err) {
      if (err) return cb(err)
      cb(null)
    })

    archive.content.on('download-finished', function () {
      self.emit('download-finished')
    })
  })

  archive.metadata.once('download-finished', function () {
    updateTotalStats()
  })

  archive.metadata.on('update', function () {
    // TODO: better stats for live updates
    updateTotalStats()
    self.emit('archive-updated')
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

Dat.prototype.joinSwarm = function () {
  var self = this
  self.swarm = createSwarm(self.archive, {port: self.port})
  self.emit('connecting')
  self.swarm.on('connection', function (peer) {
    self.emit('swarm-update')
    peer.on('close', function () {
      self.emit('swarm-update')
    })
  })
}

Dat.prototype.close = function () {
  var self = this
  self.swarm.close(function () {
    self.archive.close(function () {
      if (self.fileStats) self.fileStats.close()
    })
  })
}
