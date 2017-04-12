var assert = require('assert')
var countFiles = require('count-files')
var mirror = require('mirror-folder')
var datIgnore = require('dat-ignore')
// var debug = require('debug')('dat-node')

module.exports = importer

function importer (archive, src, opts, cb) {
  assert.ok(archive, 'lib/import-files archive required')
  assert.ok(src, 'lib/import-files src directory required')
  if (typeof opts === 'function') return importer(archive, src, {}, opts)

  opts = opts || {}
  var ignore = datIgnore(src, opts)

  // Importing
  var progress = mirror(src, {name: '/', fs: archive}, {
    watch: opts.watch,
    ignore: ignore,
    dereference: opts.dereference || true
    // TODO: opts.indexing? - how do we support that
    // TODO: opts for custom equals functions?
  }, cb)

  // File Counting
  progress.count = countFiles(src, {
    ignore: ignore,
    dereference: opts.dereference || true
  }, function (err, data) {
    if (err && !cb) return progress.emit('error', err)
    else if (err) return cb(err)
    progress.emit('count', data)
  })
  progress.options = opts

  return progress
}
