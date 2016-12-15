var assert = require('assert')
var fs = require('fs')
var path = require('path')
var datKeyAs = require('dat-key-as')
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

  var dat = {
    path: path.resolve(dir),
    options: opts
  }

  initArchive(dir, opts, function (err, archive, db) {
    if (err) return cb(err)

    dat.archive = archive
    dat.db = db
    dat.key = archive.key // only resumed/owned archives will have keys here
    dat.live = archive.live
    dat.owner = archive.owner
    dat.resumed = archive.resumed

    dat.joinNetwork = function (opts) {
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
      dat.stats = stats(archive, db)
      return dat.stats
    }

    if (archive.owner) {
      dat.importFiles = function (opts, cb) {
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
      closeNet(function () {
        closeFileWatch()
        if (opts.db) return dat.archive.close(cb)
        // TODO: do we want to close db? can't remember what was recommended...
        dat.archive.close(function () {
          closeDb(cb)
        })
      })
    }

    // dat.json
    // reads to dat.meta if exists
    // creates dat.json if not exists with title = dir name
    // (TODO: move to module & validate dat.json)
    var datJsonFile = path.join(dir, 'dat.json')
    fs.readFile(datJsonFile, 'utf8', function (err, body) {
      if (err && err.code === 'ENOENT' || !body) return createMeta()
      else if (err) return cb(err)
      try {
        dat.meta = JSON.parse(body)
      } catch (e) {
        return cb(new Error('Error reading the dat.json file.'))
      }
      done()
    })

    function createMeta () {
      dat.meta = {title: path.basename(dir), description: ''}
      if (dat.key) dat.meta.url = 'dat://' + datKeyAs.str(dat.key)
      fs.writeFile(datJsonFile, JSON.stringify(dat.meta), function (err) {
        if (err) return done(err)
        done()
      })
    }

    function done (err) {
      if (err) return cb(err)
      return cb(null, dat)
    }

    function closeDb (cb) {
      if (!dat.db) return cb()
      dat.db.close(cb)
    }

    function closeNet (cb) {
      if (!dat.network) return cb()
      dat.network.swarm.close(cb)
    }

    function closeFileWatch () {
      // TODO: add CB
      if (!dat.importer) return
      dat.importer.close()
    }
  })
}
