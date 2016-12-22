var assert = require('assert')
var initArchive = require('./lib/init-archive')
var Dat = require('./dat')

module.exports = createDat

function createDat (dir, opts, cb) {
  assert.equal(typeof dir, 'string', 'directory required')
  if (typeof opts === 'function') return createDat(dir, {}, opts)

  initArchive(dir, opts, function (err, archive, db) {
    if (err) return cb(err)

    opts.dir = dir
    var dat = new Dat(archive, db, opts)

    cb(null, dat)
  })
}
