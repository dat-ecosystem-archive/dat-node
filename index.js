var assert = require('assert')
var fs = require('fs')
var path = require('path')
var hyperdrive = require('hyperdrive')
var untildify = require('untildify')
var debug = require('debug')('dat-node')
var initArchive = require('./lib/init-archive')
var Dat = require('./dat')

module.exports = createDat

function createDat (dirOrDrive, opts, cb) {
  assert.ok(dirOrDrive, 'directory or drive required')
  if (typeof opts === 'function') return createDat(dirOrDrive, {}, opts)

  // Figure out what first arg is
  if (typeof dirOrDrive === 'string') opts.dir = dirOrDrive
  else if (dirOrDrive instanceof hyperdrive) opts.drive = dirOrDrive // TODO: will this fail if our hyperdrive vesrion is different?
  else return cb(new Error('first argument must either be a directory or hyperdrive instance'))

  // TODO: this is a multidrive thing, make it part of this API?
  if (!opts.dir && opts.drive.location) opts.dir = opts.drive.location
  else if (!opts.dir) return cb(new Error('opts.dir must be specified'))

  opts.dir = path.resolve(untildify(opts.dir))

  debug('Running initArchive on', opts.dir, 'with opts:', opts)
  initArchive(opts, function (err, archive, db) {
    if (err) return cb(err)

    var dat = new Dat(archive, db, opts)
    writeKeys(function (err) {
      if (err) return cb(err)
      debug('initArchive callback')
      cb(null, dat)
    })

    function writeKeys (cb) {
      // TODO: allow option or don't do if temp db?
      if (!dat.key) return cb() // snapshot

      var basePath = path.join(dat.path, '.dat')
      var pubKeyPath = path.join(basePath, 'key_ed25519_pub')
      fs.writeFile(pubKeyPath, dat.key.toString('base64'), function (err) {
        if (err || !dat.owner) return cb(err)
        // owner, write secret key
        var secKeyPath = path.join(basePath, 'key_ed25519')
        fs.writeFile(secKeyPath, dat.archive.metadata.secretKey.toString('base64'), cb)
      })
    }
  })
}
