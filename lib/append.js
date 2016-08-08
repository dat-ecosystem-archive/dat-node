var match = require('anymatch')
var walker = require('folder-walker')
var hyperImport = require('hyperdrive-import-files')
var each = require('stream-each')

module.exports.initialAppend = function (dat, cb) {
  var importer
  each(walker(dat.dir), countFiles, function (err) {
    if (err) cb(err)
    dat.emit('append-ready')

    importer = dat._fileStatus = hyperImport(dat.archive, dat.dir, {
      live: dat.archive.live,
      resume: dat.resume,
      ignore: dat.ignore
    }, cb)

    importer.on('error', function (err) {
      dat.emit('error', err)
    })

    importer.on('file imported', function (path, mode) {
      dat.stats.filesProgress = importer.fileCount
      dat.stats.bytesProgress = importer.totalSize
      dat.emit('file-added')
    })

    importer.on('file skipped', function (path) {
      // TODO: update stats here?
      dat.emit('file-added')
    })
  })

  function countFiles (data, next) {
    if (dat.ignore && match(dat.ignore, data.filepath)) return next()
    if (data.type === 'file') {
      dat.emit('file-counted')
      dat.stats.filesTotal += 1
      dat.stats.bytesTotal += data.stat.size
    }
    next()
  }
}
