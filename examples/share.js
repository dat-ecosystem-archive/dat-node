var path = require('path')
var Dat = require('..')

var src = path.join(__dirname, '..')

Dat(src, {temp: true}, function (err, dat) {
  if (err) throw err

  var progress = dat.importFiles(src, {
    ignore: ['**/dat-node/node_modules/**']
  }, function (err) {
    if (err) throw err
    console.log('Done importing')
  })
  progress.on('put', function (src, dest) {
    console.log('Added', src.name)
  })

  dat.joinNetwork()
  dat.trackStats()
  console.log(`Sharing: ${dat.key.toString('hex')}\n`)
})
