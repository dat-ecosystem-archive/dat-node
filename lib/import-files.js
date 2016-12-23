var assert = require('assert')
var countImport = require('hyperdrive-count-import')

module.exports = importer

function importer (archive, dir, opts, cb) {
  assert.ok(archive, 'lib/import-files archive required')
  assert.ok(dir, 'lib/import-files directory required')
  if (typeof opts === 'function') return importer(archive, dir, {}, opts)
  opts = opts || {}

  var defaultIgnore = [/^(?:\/.*)?\.dat(?:\/.*)?$/] // ignore .dat
  if (opts.ignoreHidden !== false) defaultIgnore.push(/[/\\]\./) // ignore all hidden things

  if (!opts.ignore) opts.ignore = defaultIgnore
  else if (Array.isArray(opts.ignore)) opts.ignore = opts.ignore.concat(defaultIgnore)
  else opts.ignore = [opts.ignore].concat(defaultIgnore)

  if (opts.indexing !== false) opts.indexing = true

  var importer = countImport(archive, dir, opts, cb)
  importer.options = importer.options || opts
  return importer
}
