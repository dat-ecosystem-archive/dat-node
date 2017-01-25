# dat-node

[![Travis](https://img.shields.io/travis/datproject/dat-node/master.svg?style=flat-square)](https://travis-ci.org/datproject/dat-node) [![npm](https://img.shields.io/npm/v/dat-node.svg?style=flat-square)](https://npmjs.org/package/dat-node)

[Dat](http://datproject.org) is a decentralized tool for distributing data and
files, built for scientific and research data. **dat-node** is a module to help
you build node applications using Dat on the *file system*. See
[dat-js](https://github.com/datproject/dat-js) if you want to build browser-friendly Dat applications.

Want to use Dat in the command line or an app (not build applications)? Check out:

* [Dat CLI](https://github.com/datproject/dat): Use Dat in the command line
* [Dat-Desktop](https://github.com/datproject/dat-desktop): A desktop application for Dat

#### Learn more! [docs.datproject.org](http://docs.datproject.org/) or [chat with us](https://gitter.im/datproject/discussions) ([#dat on IRC](http://webchat.freenode.net/?channels=dat))

### Features

* Consistent management of Dat archives across applications
* Join the Dat network, using [hyperdiscovery](https://github.com/karissa/hyperdiscovery)
* Track archive stats, using [hyperdrive-stats](https://github.com/juliangruber/hyperdrive-stats)
* Import files from the file system, using [hyperdrive-import-files](https://github.com/juliangruber/hyperdrive-import-files/)

### Goal of dat-node

Dat-node's primary goal is a *consistent management* of Dat archives on the file system. The main Dat CLI uses Dat-node. Any applications built using dat-node will be compatible with the Dat CLI and each other.

Dat-node acts as glue for a collection of Dat and hyperdrive based modules, including: [hyperdiscovery](https://github.com/karissa/hyperdiscovery), [hyperdrive-stats](https://github.com/juliangruber/hyperdrive-stats), and [hyperdrive-import-files](https://github.com/juliangruber/hyperdrive-import-files/).

If you want a minimal module that creates Dat archives compatible with the Dat CLI and works on the file system, check out `init-archive.js`. We should make a module that does that!

#### dat-js -> dat-node

Dat-node was previously published as dat-js.

* Dat-node ^0.1.0 is compatible with dat-js ^4.0.0
* Dat-node 1.0.0 uses a new API. [See details below](https://github.com/datproject/dat-node/#moving-from-dat-js) for how to move from the old dat-js API.

## Usage

dat-node manages a single archive inside of a folder. The folder contains the files you want to share or where the files will be downloaded. A `.dat` folder will be created inside the archive folder for the database.

### Creating a Dat Archive

Create a Dat archive on the file system inside `dir`:

```js
var Dat = require('dat-node')

Dat(dir, function (err, dat) {
  console.log(dat.path) // dat is created here with a .dat folder

  var db = dat.db // level db in .dat folder
  var archive = dat.archive // hyperdrive archive
  var key = dat.key // the archive key

  // Import Files
  var importer = dat.importFiles(opts, cb) // hyperdrive-count-import
})
```

This will create a `.dat` folder inside `dir` and import all the files within that directory.

To share the directory, you can join the network:

```js
Dat(dir, function (err, dat) {
  var importer = dat.importFiles(function () {
    console.log('Done importing')
  })

  // Join Network
  var network = dat.joinNetwork()
  console.log('Share your dat:', dat.key.toString('hex'))
})
```

This will join the network as soon as you start importing files. This means peers can download files as soon as they are imported!

### Downloading a Dat archive

Downloading a Dat archive is similar, but you also have to pass `{key: <download-key} as an option. You have to join the network in order for downloads to start!

```js
var Dat = require('dat-node')

Dat(dir, {key: 'download-key'}, function (err, dat) {
  // Join the network
  var network = dat.joinNetwork(opts)
  network.swarm // hyperdiscovery
  network.connected // number of connected peers

  // Track stats
  var stats = dat.trackStats() // hyperdrive-stats
  stats.network // hyperdrive-network-speed
})
```

Dat-node uses hyperdrive stats to track how much has been downloaded so you can display progress and exit when the download is finished.

### Example Applications

* [dat-next](https://github.com/joehand/dat-next): We use dat-node in the dat-next CLI. See that for a full example of how to use dat-node.
* YOUR APP HERE. *Use dat-node in an interesting use case? Send us your example!*

## API

### `Dat(dir|drive, [opts], cb)``

Initialize a Dat Archive in `dir`. If there is an existing Dat Archive, the archive will be resumed. You can also pass a `hyperdrive` instance.

`dir` or `opts.dir` is always required. If you use a `drive` and set `drive.location` that will be set to `opts.dir`.

Most options are passed directly to the module you're using (e.g. `dat.importFiles(opts)`. However, there are also some initial `opts` can include:

```js
opts = {
  key: '<dat-key>', // existing key to create archive with or resume
  dir: 'some/dir', // directory for the archive

  // Hyperdrive createArchive options
  live: Boolean, // archive.live setting (only set if archive is owned)
  file: raf(path.join(opts.dir, name)), // file option for hyperdrive.createArchive()

  // If only dir is specified (not a custom drive/db) You can use these options:
  createIfMissing: true, // create db if doesn't exist
  errorIfExists: false, // error if existing archive in database
  dbPath: path.join(opts.dir,'.dat') // directory name for level database
}
```

The callback, `cb(err, dat)`, includes a `dat` object that has the following properties:

* `dat.key`: key of the dat (this will be set later for non-live archives)
* `dat.archive`: Hyperdrive archive instance.
* `dat.db`: leveldb database in `.dat` folder
* `dat.path`: Path of the Dat Archive
* `dat.live`: `archive.live`
* `dat.owner`: `archive.owner`
* `dat.resumed`: `true` if the archive was resumed from an existing database
* `dat.options`: All options passed to Dat and the other submodules

**`dat-node` provides an easy interface to common Dat modules for the created Dat Archive on the `dat` object provided in the callback:**

#### `var network = dat.joinNetwork([opts])`

Join the Dat Network for your Dat Archive.

`opts` are passed to the swarm module. See [hyperdiscovery](https://github.com/karissa/hyperdiscovery) for options.

Returns a [discovery-swarm](https://github.com/mafintosh/discovery-swarm) instance.

Also can use `dat.join([opts])`

#### `dat.leaveNetwork()` or `dat.leave()`

Leaves the network for the archive.

##### `network.connected`

Get number of peers connected to you.

#### `var importer = dat.importFiles([dir], [opts], [cb])`

**(must be the archive owner)**

Import files to your Dat Archive from the directory using [hyperdrive-import-files](https://github.com/juliangruber/hyperdrive-import-files/). Options are passed to the importer module. `cb` is called when import is finished.

By default, files will be imported from the folder where the archive was initiated. Import files from another directory by specifying `dir`.

Returns the importer event emitter.

##### Importer Ignore Option: `opts.ignore`

`dat-node` provides a default ignore option, ignoring the `.dat` folder and all hidden files or directories. Use `opts.ignoreHidden = false` to import hidden files or folders, except the `.dat` directory.

*It's important that the `.dat` folder is not imported because it contains a private key that allows the owner to write to the archive.*

#### `var stats = dat.trackStats()`

[hyperdrive-stats](https://github.com/juliangruber/hyperdrive-stats) instance for the Dat Archive. Stats are stored in a sublevel database in the `.dat` folder.

##### `stats.network`

Get upload and download speeds: `stats.network.uploadSpeed` or `stats.network.downloadSpeed`. Transfer speeds are tracked using [hyperdrive-network-speed](https://github.com/joehand/hyperdrive-network-speed/).

#### `dat.close(cb)`

Close the archive, database, swarm, and file watchers if active.

If you passed `opts.db`, you'll be responsible for closing it.

### Advanced Usage

### Multidrive

Use the [multidrive module](https://github.com/yoshuawuyts/multidrive) with dat-node to manage many hyperdrive instances.

```js
const multidrive = require('multidrive')

const manager = multidrive('my-cool-archive', (err) => {
  if (err) console.error(err)
})
const driveLocation = process.cwd()

manager.create('cute-cats', driveLocation, (err, drive) => {
  if (err) return console.error(err)

  Dat(drive, {key: someKey}, (err, dat) => {
    // Do things
    const archive = dat.archive
    dat.importFiles() // import from driveLocation => add to archive
    dat.importFiles(targetDir) // import from another targetDir => drive location + add to archive
  })
})
```

## Moving from dat-js

Dat-node 1.0 has a very different API than dat-js and dat-node v0. The previous API returned an object with events. The new API uses a callback to ensure everything is done before using the archive.

Archives are created with a callback function. Once the archive is created, you can join the network directly without choosing to share or download. If the user owns the archive, they will be able to import files.

Directory is now the first argument, and a required argument.

#### Sharing

For example, previously to share files with dat-js we would write:

```js
// dat-js OLD API
var dat = Dat({dir: dir})
dat.share(function () {
   // automatically import files
   // automatically join network
  console.log('now sharing:', dat.key.toString())
})
```

In dat-node this would be:

```js
// dat-node v1 NEW API
Dat(dir, function (err, dat) {
  var network = dat.joinNetwork(opts) // join network
  console.log('now sharing:', dat.key.toString())

  // import files
  var importer = dat.importFiles(opts, function () {
    console.log('done importing files')
  })

  // get stats info (via hyperdrive-stats)
  var stats = dat.trackStats()
})
```

You may have used the `dat.open()` function previously. This is now done before the callback, no need to open anything! Don't worry, you can still close it.

#### Downloading

Previously to download files with dat-js we would write:

```js
// dat-js OLD API
var dat = Dat({dir: dir, key: link})
dat.download()
console.log('downloading...')
```

In dat-node this would be:

```js
// dat-node v1 NEW API
Dat(dir, {key: link}, function (err, dat) {
  var network = dat.joinNetwork(opts) // join network
  console.log('now downloading')

  var stats = dat.trackStats() // get hyperdrive-stats info
})
```

## License

MIT
