var assert = require('assert')
var fs = require('fs')
var path = require('path')
var match = require('anymatch')
var countFiles = require('count-files')
var hyperImport = require('hyperdrive-import-files')
var debug = require('debug')('dat-node')

module.exports = importer

function importer (archive, target, opts, cb) {
  assert.ok(archive, 'lib/import-files archive required')
  assert.ok(target, 'lib/import-files target directory required')
  if (typeof opts === 'function') return importer(archive, target, {}, opts)

  opts = opts || {}
  opts.ignore = opts.ignore // we want an array here
    ? Array.isArray(opts.ignore)
      ? opts.ignore
      : [opts.ignore]
    : []
  var defaultIgnore = [/^(?:\/.*)?\.dat(?:\/.*)?$/] // ignore .dat
  var ignoreHidden = [/[/\\]\./]
  var datIgnore = !(opts.useDatIgnore === false) ? getDatIgnore(target) : []

  // Add ignore options
  opts.ignore = opts.ignore.concat(defaultIgnore) // always ignore .dat folder
  if (datIgnore) opts.ignore = opts.ignore.concat(datIgnore) // add .datignore
  if (opts.ignoreHidden !== false) opts.ignore = opts.ignore.concat(ignoreHidden) // ignore all hidden things

  var importer = hyperImport(archive, target, opts, cb)
  importer.options = importer.options || opts

  debug('Importer created. Counting Files.')
  // Start counting the files
  var countStats = countFiles(target, {
    ignore: function (file) {
      return match(opts.ignore, file)
    }
  }, function (err, stats) {
    if (err) cb(err)
    debug('File count finished', countStats)
    importer.emit('count finished', countStats)
  })
  importer.countStats = countStats // TODO: make importer vs count stats clearer

  return importer
}

function getDatIgnore (dir) {
  try {
    return fs.readFileSync(path.join(dir, '.datignore'), 'utf8')
      .split('\n')
      .filter(function (str) {
        return !!str.trim()
      })
      .map(function (line) {
        return path.join(dir, line) // prepend the dir to each line
      })
  } catch (e) {
    return []
  }
}
