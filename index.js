var assert = require('assert')
var path = require('path')
var initArchive = require('./lib/init-archive')
var importFiles = require('./lib/import-files')
var network = require('./lib/network')
var stats = require('./lib/stats')

module.exports = function (dir, opts, cb) {
  assert.ok(dir, 'directory required')
  if (typeof opts === 'function') cb = opts

  var dat = {
    path: path.resolve(dir),
    options: opts
  }

  initArchive(dir, opts, function (err, archive, db) {
    if (err) return cb(err)

    dat.archive = archive
    dat.db = db
    dat.network = function (opts) {
      return network(archive, opts)
    }
    dat.stats = function () {
      return stats(archive, db)
    }
    if (archive.owner) {
      dat.importFiles = function (opts, cb) {
        return importFiles(archive, dir, opts, cb)
      }
    }

    cb(null, dat)
  })
}
