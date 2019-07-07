const path = require('path')
const Dat = require('..');

(async () => {
  const src = path.join(__dirname, '..')
  console.log(`sharing ${src}`)

  const dat = await Dat(src, { temp: true })
  const network = await dat.joinNetwork()
  network.once('connection', () => {
    console.log('Connected')
  })

  dat.importFiles(src, {
    ignore: ['node_modules', 'test']
  })

  dat.importer.on('put', (src, dest) => {
    console.log('IMPORT:', dest.name)
  })
  // dat.importer.on('ignore', (src, dest) => {
  //   console.log('IGNORE:', dest.name)
  // })

  console.log(`Sharing: ${dat.key.toString('hex')}\n`)
})()
