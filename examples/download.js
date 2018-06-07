var fs = require('fs')
var path = require('path')
var mirror = require('mirror-folder')
var ram = require('random-access-memory')
var Dat = require('..')

var key = process.argv[2]
if (!key) {
  console.error('Run with: node examples/download.js <key>')
  process.exit(1)
}

var dest = path.join(__dirname, 'tmp')
fs.mkdirSync(dest)

Dat(dest, {key: key}, function (err, dat) {
  if (err) throw err
  var network = dat.joinNetwork()
  network.once('connection', function () {
    console.log('Connected')
  })
  dat.archive.db.source.on('sync', function () {
    console.log('source sync')
  })
  
  console.log(`Downloading: ${dat.key.toString('hex')}\n`)
})
