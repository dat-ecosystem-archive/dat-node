var assert = require('assert')
var countFiles = require('count-files')
var mirror = require('mirror-folder')
var datIgnore = require('dat-ignore')
var xtend = require('xtend')
// var debug = require('debug')('dat-node')

module.exports = importer

function importer (archive, src, opts, cb) {
  assert.ok(archive, 'lib/import-files archive required')
  assert.ok(src, 'lib/import-files src directory required')
  if (typeof opts === 'function') return importer(archive, src, {}, opts)

  opts = xtend({
    watch: false,
    dereference: true
    // TODO: opts.indexing? - how do we support that
    // TODO: opts for custom equals functions?
  }, opts, {
    // overwrite opts.ignore (ignore opts are parsed in dat-ignore)
    ignore: datIgnore(src, opts)
  })

  // Importing
  var progress = mirror(src, {name: '/', fs: archive}, opts, cb)

  // File Counting
  progress.count = countFiles(src, opts, function (err, data) {
    if (err && !cb) return progress.emit('error', err)
    else if (err) return cb(err)
    progress.emit('count', data)
  })
  progress.options = opts

  return progress
}
