var assert = require('assert')
var mirror = require('mirror-folder')
var datIgnore = require('dat-ignore')
var speed = require('speedometer')
var xtend = require('xtend')
// var debug = require('debug')('dat-node')

module.exports = importer

function importer (archive, src, opts, cb) {
  assert.ok(archive, 'lib/import-files archive required')
  assert.ok(src, 'lib/import-files src directory required')
  if (typeof opts === 'function') return importer(archive, src, {}, opts)

  var progress
  var indexSpeed = speed()
  opts = xtend({
    watch: false,
    dereference: true,
    count: true
  }, opts, {
    // overwrite opts.ignore (original opts.ignore parsed in dat-ignore)
    ignore: datIgnore(src, opts)
  })

  if (opts.count) {
    // Dry Run Import to get initial import size
    var importCount = { files: 0, bytes: 0 }
    var dryRunOpts = xtend(opts, { dryRun: true, watch: false }) // force right side opts
    var dryRun = mirror(src, {name: '/', fs: archive}, dryRunOpts, function (err) {
      if (err) return cb(err)
      progress.emit('count', importCount)
    })
    dryRun.on('put', function (src, dst) {
      if (src.stat.isDirectory() || src.live) return
      importCount.bytes += src.stat.size
      importCount.files++
    })
  }

  // Importing
  progress = mirror(src, {name: '/', fs: archive}, opts, cb)
  progress.on('put-data', function (chunk, src, dst) {
    progress.indexSpeed = indexSpeed(chunk.length)
  })
  if (opts.count) {
    progress.count = importCount
    progress.putDone = 0
    progress.on('put-end', function (src, dst) {
      if (!src.live) progress.putDone++
    })
  }

  progress.options = opts
  return progress
}
