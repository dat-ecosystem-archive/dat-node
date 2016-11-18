var path = require('path')
var datDb = require('dat-folder-db')
var hyperdrive = require('hyperdrive')
var raf = require('random-access-file')

module.exports = function (dir, opts, cb) {
  datDb(dir, opts, function (err, db, key, saveKey) {
    if (err) return cb(err)
    if (opts.resume && !key) return cb('No existing archive. Please use create or clone first.')
    if (!opts.resume && key) return cb(`Archive exists in directory, cannot overwrite. \nExisting key: ${key}`)
    if (key && opts.key && opts.key !== key) return cb('Error: todo')

    var drive = hyperdrive(db)
    var archive = drive.createArchive(key || opts.key, {
      live: true,
      file: function (name) {
        return raf(path.join(dir, name))
      }
    })

    if (key) return done() // Key already in db
    saveKey(archive.key, function (err) {
      // Saves key back to db for resuming.
      if (err) return cb(err)
      done()
    })

    function done () {
      if (!key && opts.key) {
        // Downloading a new archive (can't archive.open)
        archive.owner = false // TODO: HACK!
        return cb(null, archive, db)
      }
      archive.open(function (err) {
        if (err) return cb(err)
        cb(null, archive, db)
      })
    }
  })
}
