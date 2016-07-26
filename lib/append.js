var match = require('anymatch')
var walker = require('folder-walker')
var hyperImport = require('hyperdrive-import-files')
var each = require('stream-each')

module.exports.initialAppend = function (dat, cb) {
  var status
  each(walker(dat.dir), countFiles, function (err) {
    if (err) cb(err)
    dat.emit('append-ready')

    status = dat.fileStatus = hyperImport(dat.archive, dat.dir, {
      live: false, // dat.archive.live,
      resume: dat.resume,
      ignore: dat.ignore
    }, cb)

    status.on('error', function (err) {
      dat.emit('error', err)
    })

    status.on('file imported', function (path, mode) {
      dat.stats.filesProgress = status.fileCount
      dat.stats.bytesProgress = status.totalSize
      dat.emit('file-added')
    })

    status.on('file skipped', function (path) {
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
