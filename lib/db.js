var fs = require('fs')
var encoding = require('dat-encoding')
var level = require('level')

module.exports = function getDb (dat, cb) {
  if (!dat.db) {
    try {
      fs.accessSync(dat._datPath, fs.F_OK)
    } catch (e) { fs.mkdirSync(dat._datPath) }
    dat.db = level(dat._datPath, function (err) {
      if (err) return cb(err)
      tryResume()
    })
  } else {
    tryResume()
  }

  function tryResume () {
    var db = dat.db
    if (dat.options.port) db.put('!dat!port', dat.options.port)
    db.get('!dat!key', function (err, value) {
      if (err && !err.notFound) return cb(err)
      if (!value) return cb(null, db)
      if (dat.key && dat.key.toString('hex') !== value) return cb('Another Dat was already downloaded here.')

      value = encoding.decode(value)
      dat.key = value
      dat.resume = true

      if (dat.options.port) return cb(null) // Port set in opts
      db.get('!dat!port', function (err, portVal) {
        if (err && !err.notFound) return cb(err)
        if (portVal) dat.options.port = portVal
        cb(null)
      })
    })
  }
}
