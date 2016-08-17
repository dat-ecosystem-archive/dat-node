var fs = require('fs')
var encoding = require('dat-encoding')

module.exports = function getDb (dat, cb) {
  if (!dat.db) {
    try {
      fs.accessSync(dat.datPath, fs.F_OK)
    } catch (e) { fs.mkdirSync(dat.datPath) }
    dat.db = require('level')(dat.datPath)
  }
  tryResume()

  function tryResume () {
    var db = dat.db
    if (dat.port) db.put('!dat!port', dat.port)
    db.get('!dat!key', function (err, value) {
      if (err && !err.notFound) return cb(err)
      if (!value) return cb(null, db)
      if (dat.key && dat.key.toString('hex') !== value) return cb('Another Dat was already downloaded here.')

      value = encoding.decode(value)
      dat.key = value
      dat.resume = true

      if (dat.port) return cb(null) // Port set in opts
      db.get('!dat!port', function (err, portVal) {
        if (err && !err.notFound) return cb(err)
        if (portVal) dat.port = portVal
        cb(null)
      })
    })
  }
}
