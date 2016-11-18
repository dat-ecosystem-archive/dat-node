var Stats = require('hyperdrive-stats')
var sub = require('subleveldown')
var encoding = require('dat-encoding')

module.exports = function (archive, db) {
  var stats = Stats({
    archive: archive,
    db: sub(db, `${encoding.encode(archive.key)}-stats`)
  })

  return stats
}
