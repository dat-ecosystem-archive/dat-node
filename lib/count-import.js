var match = require('anymatch')
var walker = require('folder-walker')
var hyperImport = require('hyperdrive-import-files')
var each = require('stream-each')

module.exports = function (archive, dir, opts, cb) {
  if (typeof opts === 'function') cb = opts
  if (!opts) opts = {}
  var importer
  var stats = {
    filesTotal: 0,
    bytesTotal: 0
  }

  each(walker(dir), countFiles, function (err) {
    if (err) cb(err)
    importer.emit('files-counted', stats)
  })

  importer = hyperImport(archive, dir, {
    overwrite: false, // tmp workaround until watching is stable - NEVER overwrite existing files
    live: opts.live,
    resume: opts.resume,
    ignore: opts.ignore
  }, cb)

  return importer

  function countFiles (data, next) {
    if (opts.ignore && match(opts.ignore, data.filepath)) return next()
    if (data.type === 'file') {
      stats.filesTotal += 1
      stats.bytesTotal += data.stat.size
      importer.emit('file-counted', stats)
    }
    next()
  }
}
