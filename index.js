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
  self.dir = opts.dir === '.' ? process.cwd() : path.resolve(opts.dir)
  if (opts.db) self.db = opts.db
  else self.datPath = opts.datPath || path.join(self.dir, '.dat')
  self.snapshot = opts.snapshot || false
  self.port = opts.port
  self.ignore = [/\.dat\//] || opts.ignore
  self.swarm = null
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
    if (err) return self.emit('error', err)
    var drive = hyperdrive(self.db)
    var isLive = self.key ? null : !self.snapshot
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
      self.emit('key', archive.key.toString('hex'))
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

  self.joinSwarm()
  self.emit('key', archive.key.toString('hex'))

  archive.open(function (err) {
    if (err) return cb(err)
    self.db.put('!dat!key', archive.key.toString('hex'))
    updateTotalStats()

    archive.content.on('download-finished', function () {
      self.emit('download-finished')
    })

    each(archive.list({live: archive.live}), function (data, next) {
      var startBytes = self.stats.bytesProgress
      archive.download(data, function (err) {
        if (err) return cb(err)
        self.stats.filesProgress += 1
        if (startBytes === self.stats.bytesProgress) {
          // TODO: better way to measure progress with existing files
          self.stats.bytesProgress += data.length // file already exists
        }
        // if (self.stats.filesProgress === self.stats.filesTotal) self.emit('download-finished')
        next()
      })
    }, function (err) {
      if (err) return cb(err)
      cb(null)
    })
  })

  archive.metadata.once('download-finished', updateTotalStats)

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

Dat.prototype.close = function (cb) {
  var self = this
  self.swarm.close(function () {
    if (self._fileStatus) self._fileStatus.close()
    self.archive.close(function () {
      self.db.close(cb)
    })
  })
}
