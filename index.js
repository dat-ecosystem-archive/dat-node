var initArchive = require('./lib/initArchive')
var importFiles = require('./lib/importFiles')
var network = require('./lib/network')
var stats = require('./lib/stats')

module.exports = function (dir, opts, cb) {
  var dat = {}

  initArchive(dir, opts, function (err, archive, db) {
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
