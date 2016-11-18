var importer = require('hyperdrive-count-import')

module.exports = function (archive, dir, opts, cb) {
  if (!opts) opts = {}
  if (!opts.ignore) opts.ignore = [/^(?:\/.*)?\.dat(?:\/.*)?$/, /[\/\\]\./] // ignore .dat and all hidden

  return importer(archive, dir, opts, cb)
}
