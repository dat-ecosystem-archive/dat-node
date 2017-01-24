var assert = require('assert')
var fs = require('fs')
var path = require('path')

module.exports = {
  readKeys: function (dir, cb) {
    assert.ok(dir, 'lib/keys readKeys dir required')
    assert.ok(cb, 'lib/keys readKeys cb required')
    var keys = {}
    var pubKeyPath = path.join(dir, 'key_ed25519_pub')
    var secKeyPath = path.join(dir, 'key_ed25519')

    fs.readFile(pubKeyPath, function (err, data) {
      if (err) return cb(err)
      keys.public = Buffer.from(data, 'hex')
      fs.readFile(secKeyPath, function (err, data) {
        if (err) return cb(err)
        keys.secret = Buffer.from(data, 'hex')
        cb(null, keys)
      })
    })
  },
  writeKeys: function (archive, dir, cb) {
    assert.ok(archive, 'lib/keys writeKeys archive required')
    assert.ok(dir, 'lib/keys writeKeys dir required')
    assert.ok(cb, 'lib/keys writeKeys cb required')
    if (!archive.key) return cb() // snapshot
    var pubKeyPath = path.join(dir, 'key_ed25519_pub')
    var secKeyPath = path.join(dir, 'key_ed25519')
    fs.writeFile(pubKeyPath, archive.key, function (err) {
      if (err || !archive.owner) return cb(err)
      // owner, write secret key for metadata
      fs.writeFile(secKeyPath, archive.metadata.secretKey, cb)

      // TODO: write content keys?
    })
  }
}
