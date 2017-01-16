var assert = require('assert')
var path = require('path')
var untildify = require('untildify')
var multicb = require('multicb')
var debug = require('debug')('dat-node')
var initArchive = require('./lib/init-archive')
var importFiles = require('./lib/import-files')
var network = require('./lib/network')
var stats = require('./lib/stats')

module.exports = function (dir, opts, cb) {
  assert.ok(dir, 'directory required')
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  dir = path.resolve(untildify(dir))

  var dat = {
    path: dir,
    options: opts
  }
  debug('Running initArchive on', dir, 'with opts:', opts)
  initArchive(dir, opts, function (err, archive, db) {
    if (err) return cb(err)

    debug(`${archive.resumed ? 'Resumed' : 'Created'} archive ${archive.key && archive.key.toString('hex')}`)
    debug(`Live: ${archive.live}, Owner: ${archive.owner}`)

    dat.archive = archive
    dat.db = db
    dat.key = archive.key // only resumed/owned archives will have keys here
    dat.live = archive.live
    dat.owner = archive.owner
    dat.resumed = archive.resumed

    dat.joinNetwork = function (opts) {
      debug('Joining network with opts:', opts)
      dat.network = network(archive, opts)
      dat.options.network = dat.network.options
      if (dat.owner) return dat.network

      dat.network.swarm.once('connection', function () {
        // automatically open archive and set exposed values
        archive.open(function () {
          // dat.owner = archive.owner // For future multi-writer?
          dat.live = archive.live
        })
      })
      return dat.network
    }

    dat.trackStats = function () {
      debug('Tracking Stats')
      dat.stats = stats(archive, db)
      return dat.stats
    }

    if (archive.owner) {
      dat.importFiles = function (opts, cb) {
        debug('Importing Files with opts:', opts)
        if (typeof opts === 'function') return dat.importFiles({}, opts)
        if (archive.live) {
          dat.importer = importFiles(archive, dir, opts, cb)
        } else {
          dat.importer = importFiles(archive, dir, opts, function (err) {
            if (err) return cb(err)
            // Sets dat.key for snapshot
            archive.finalize(function (err) {
              if (err) return cb(err)
              dat.key = archive.key
              // TODO: need to get snapshot key back in db, better way?
              db.put('!dat!key', archive.key.toString('hex'), cb)
            })
          })
        }
        dat.options.importer = dat.importer.options
        return dat.importer
      }
    }

    dat.close = function (cb) {
      var done = multicb()
      closeNet(done())
      closeFileWatch(done())
      closeArchiveDb(done())

      done(cb)
    }

    cb(null, dat)

    function closeArchiveDb (cb) {
      dat.archive.close(function (err) {
        if (err) return cb(err)
        if (opts.db || !dat.db) return cb(null)
        closeDb(cb)
      })
    }

    function closeDb (cb) {
      if (!dat.db) return cb()
      dat.db.close(cb)
    }

    function closeNet (cb) {
      if (!dat.network) return cb()
      dat.network.swarm.close(cb)
    }

    function closeFileWatch (cb) {
      if (!dat.importer) return cb()
      dat.importer.close()
      cb() // TODO: dat importer close is currently sync-ish
    }
  })
}
