var fs = require('fs')
var path = require('path')
var toilet = require('toiletdb')
var homedir = require('os-homedir')
var raf = require('random-access-file')
var thunky = require('thunky')
var debug = require('debug')('dat-node')

module.exports = function (dir) {
  var publicKeyPath = path.join(dir, 'metadata', 'key') // TODO: better ideas?
  var readPublicKey = thunky(function (cb) {
    raf(publicKeyPath).read(0, 32, cb)
  })

  var toiletDir = path.join(homedir(), '.dat')
  var getDbKey = thunky(function (cb) {
    readPublicKey(function (err, key) {
      if (err) return cb(err)
      var pubKey = key.toString('hex')
      var filename = `${pubKey}-key.json`
      if (!fs.existsSync(toiletDir)){
        fs.mkdirSync(toiletDir)
      }

      debug('secret_key stored in', path.join(toiletDir, filename))
      var db = toilet(path.join(toiletDir, filename))
      cb(null, db, pubKey)
    })
  })

  return storage

  function storage (filename) {
    debug('storage()', filename)
    if (filename === 'metadata/key') {
      var pkRaf = raf(publicKeyPath)
      pkRaf.read = function (offset, length, cb) {
        return readPublicKey(cb)
      }
      return pkRaf
    } else if (filename === 'metadata/secret_key') {
      var keyStore = {}
      keyStore.read = function (offset, length, cb) {
        debug('read() metadata/secret_key from toilet')
        getDbKey(function (err, db, pubKey) {
          if (err) return cb(err)
          db.read(function (err, data) {
            if (err) return cb(err)
            cb(err, data[pubKey])
          })
        })
      }
      keyStore.write = function (offset, buffer, cb) {
        debug('write() metadata/secret_key to toilet')
        getDbKey(function (err, db, pubKey) {
          if (err) return cb(err)
          db.write(pubKey, buffer.toString('hex'), cb)
        })
      }
      return keyStore
    }
    return raf(path.join(dir, filename))
  }
}
