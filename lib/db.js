var fs = require('fs')
var encoding = require('dat-encoding')
var level = require('level')

module.exports = function getDb (dat, cb) {
  var EXISTS_ERROR = 'Error: Destination path already exists and contains a different dat. \
    \nPlease download to a new directory or remove the existing .dat folder.'

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
      var key = dat.key
        ? typeof dat.key === 'string'
          ? dat.key : dat.key.toString('hex')
        : null
      if (key && key !== value) return cb(EXISTS_ERROR)

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
