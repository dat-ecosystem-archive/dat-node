var countFiles = require('count-files')

var fixtureStats = {
  files: 3,
  bytes: 1452,
  dirs: 1
}

module.exports.verifyFixtures = function (t, archive, cb) {
  var pending = 4

  archive.stat('/table.csv', function (err, stat) {
    if (err) return cb(err)
    t.same(stat.size, 1441, 'stat size ok')
    if (!--pending) return done()
  })

  archive.stat('/folder/empty.txt', function (err, stat) {
    if (err) return cb(err)
    t.same(stat.size, 0, 'stat size ok')
    if (!--pending) return done()
  })

  archive.readdir('/', function (err, entries) {
    if (err) return cb(err)
    t.ok(entries.indexOf('table.csv') > -1, 'csv in archive')
    t.ok(entries.indexOf('folder') > -1, 'sub dir in archive')
    t.ok(entries.indexOf('hello.txt') > -1, 'hello file archive')
    if (!--pending) return done()
  })

  archive.readdir('/folder', function (err, entries) {
    if (err) return cb(err)
    t.ok(entries.indexOf('empty.txt') > -1, 'has empty file')
    if (!--pending) return done()
  })

  function done () {
    countFiles({ fs: archive, name: '/' }, function (err, count) {
      if (err) return cb(err)
      t.same(count, fixtureStats, 'archive stats are correct')
      cb()
    })
  }
}
