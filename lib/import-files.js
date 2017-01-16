var assert = require('assert')
var each = require('stream-each')
var match = require('anymatch')
var walker = require('folder-walker')
var hyperImport = require('hyperdrive-import-files')

module.exports = importer

function importer (archive, dir, opts, cb) {
  assert.ok(archive, 'lib/import-files archive required')
  assert.ok(dir, 'lib/import-files directory required')
  if (typeof opts === 'function') return importer(archive, dir, {}, opts)
  opts = opts || {}

  var countStats = {
    files: 0,
    bytes: 0
  }

  // Set default ignore and hidden ignore option
  var defaultIgnore = [/^(?:\/.*)?\.dat(?:\/.*)?$/] // ignore .dat
  if (opts.ignoreHidden !== false) defaultIgnore.push(/[/\\]\./) // ignore all hidden things

  // Update ignore with any opts passed
  if (!opts.ignore) opts.ignore = defaultIgnore // no opt, use default
  else if (Array.isArray(opts.ignore)) opts.ignore = opts.ignore.concat(defaultIgnore)
  else opts.ignore = [opts.ignore].concat(defaultIgnore)

  if (opts.indexing !== false) opts.indexing = true

  var importer = hyperImport(archive, dir, opts, cb)
  importer.options = importer.options || opts

  // Start counting the files
  each(walker(dir), countFiles, function (err) {
    if (err) cb(err)
    importer.emit('count finished', countStats)
  })
  importer.countStats = countStats // TODO: make importer vs count stats clearer

  return importer

  function countFiles (data, next) {
    if (opts.ignore && match(opts.ignore, data.filepath)) return next()
    if (data.type === 'file') {
      countStats.files += 1
      countStats.bytes += data.stat.size
      importer.emit('file counted')
    }
    next()
  }
}
