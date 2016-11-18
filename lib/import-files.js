var assert = require('assert')
var importer = require('hyperdrive-count-import')

module.exports = function (archive, dir, opts, cb) {
  assert.ok(archive, 'lib/import-files archive required')
  assert.ok(dir, 'lib/import-files directory required')
  if (!opts) opts = {}

  var defaultIgnore = [/^(?:\/.*)?\.dat(?:\/.*)?$/, /[\/\\]\./] // ignore .dat and all hidden

  if (!opts.ignore) opts.ignore = defaultIgnore
  else if (Array.isArray(opts.ignore)) opts.ignore = opts.ignore.concat(defaultIgnore)
  else opts.ignore = [opts.ignore].concat(defaultIgnore)

  return importer(archive, dir, opts, cb)
}
