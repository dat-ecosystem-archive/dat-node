var fs = require('fs')
var path = require('path')
var homedir = require('os-homedir')
var raf = require('random-access-file')
var thunky = require('thunky')
var mkdirp = require('mkdirp')
var debug = require('debug')('dat-node')

module.exports = function (opts) {
  return function (filename) {
    debug('storage()', filename)

    var dir = opts.dir
    if (filename !== 'metadata/secret_key') return raf(path.join(dir, filename))

    var archive = opts.archive
    var publicKeyPath = path.join(dir, 'metadata', 'key')
    // TODO: make hypercore not call the storage function until before it has read the public key
    var readPublicKey = thunky(function (cb) {
      if (archive && archive.key) return cb(null, archive.key.toString('hex'))
      fs.readFile(publicKeyPath, cb)
    })

    var keyDir = path.join(homedir(), '.dat', 'secret_keys')
    var getKeyFile = thunky(function (cb) {
      readPublicKey(function (err, pubKey) {
        if (err) return cb(err)
        pubKey = pubKey.toString('hex')
        debug('secret_key stored in', keyDir)
        var filePath = path.join(keyDir, pubKey)
        cb(null, raf(filePath), pubKey)
      })
    })
    var keyStore = {}
    keyStore.read = function (offset, length, cb) {
      debug('read() metadata/secret_key from toilet')
      getKeyFile(function (err, fileRaf) {
        if (err) return cb(err)
        fileRaf.read(offset, length, cb)
      })
    }
    keyStore.write = function (offset, buffer, cb) {
      debug('write() metadata/secret_key to toilet')
      getKeyFile(function (err, fileRaf) {
        if (err) return cb(err)
        fileRaf.write(offset, buffer, cb)
      })
    }
    return keyStore
  }
}
