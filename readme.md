# dat-node

[![npm][0]][1] [![Travis][2]][3] [![Test coverage][4]][5]

[Dat](http://datproject.org) is a decentralized tool for distributing data and
files, built for scientific and research data.
You can start using Dat today in these client applications:

* [Dat Command Line](https://github.com/datproject/dat): Use Dat in the command line
* [Dat Desktop](https://github.com/datproject/dat-desktop): A desktop application for Dat
* [Beaker Browser](beakerbrowser.com): An experimental P2P browser with Dat built in

**dat-node** is a high-level module to help
you build node applications using Dat on the *file system*.
See [dat-js](https://github.com/datproject/dat-js) if you want to build browser-friendly Dat applications.

#### Learn more! [docs.datproject.org](http://docs.datproject.org/) or [chat with us](https://gitter.im/datproject/discussions) ([#dat on IRC](http://webchat.freenode.net/?channels=dat))

#### Read about the Dat protocol at [datprotocol.com](https://www.datprotocol.com/)

### Features

* Consistent management of Dat archives across applications
* Join the Dat network, using [discovery-swarm](https://github.com/mafintosh/discovery-swarm)
* Track archive stats, using [hyperdrive-stats](https://github.com/juliangruber/hyperdrive-stats) and [hyperdrive-network-speed](https://github.com/joehand/hyperdrive-network-speed)
* Import files from the file system, using [hyperdrive-import-files](https://github.com/juliangruber/hyperdrive-import-files/)

### Goal of dat-node

Dat-node's primary goals are:

* *consistent management* of Dat archives on the file system. The Dat CLI uses Dat-node. Any applications built using dat-node will be compatible with the Dat CLI and each other.
* High-level glue for common Dat and hyperdrive modules, including: [discovery-swarm](https://github.com/mafintosh/discovery-swarm), [hyperdrive-stats](https://github.com/juliangruber/hyperdrive-stats), and [hyperdrive-import-files](https://github.com/juliangruber/hyperdrive-import-files/).

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
  network.activeConnections // number of connected peers

  // Track stats
  var stats = dat.trackStats() // hyperdrive-stats
  stats.network // hyperdrive-network-speed
})
```

Dat-node uses hyperdrive stats to track how much has been downloaded so you can display progress and exit when the download is finished.

### FAQ

#### How do I start/stop replicating an archive?

Dat-node will automatically start replication when you join the network (`dat.joinNetwork`). To stop replicating an archive, leave the network (`dat.leave()`).

### Example Applications

* [dat-next](https://github.com/joehand/dat-next): We use dat-node in the dat-next CLI. See that for a full example of how to use dat-node.
* YOUR APP HERE. *Use dat-node in an interesting use case? Send us your example!*

## API

### `Dat(dir|drive, [opts], cb)``

Initialize a Dat Archive in `dir`. If there is an existing Dat Archive, the archive will be resumed. You can also pass a `hyperdrive` instance.

**`dir` or `opts.dir` is always required.**

Most options are passed directly to the module you're using (e.g. `dat.importFiles(opts)`. However, there are also some initial `opts` can include:

```js
opts = {
  dir: 'some/dir', // REQUIRED: directory for the files + database
  key: '<dat-key>', // existing key to create archive with or resume
  db: level(path.join(opts.dir, '.dat')) // custom level compatible db

  // Hyperdrive options
  live: false, // archive.live setting (only set if archive is owned)
  file: raf(path.join(opts.dir, name)), // file option for hyperdrive.createArchive()
  sparse: false, // set this to only download the pieces of the feed you are requesting / prioritizing

  // If only dir is specified (not drive or db) You can use these options:
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

### Module Interfaces

**`dat-node` provides an easy interface to common Dat modules for the created Dat Archive on the `dat` object provided in the callback:**

#### `var network = dat.joinNetwork([opts], [cb])`

Join the network to start transferring data for `dat.key`, using [discovery-swarm](https://github.com/mafintosh/discovery-swarm). You can also can use `dat.join([opts], [cb])`.

If you specify `cb`, it will be called *when the first round* of discovery has completed. This is helpful to check immediately if peers are available and if not fail gracefully, more similar to http requests.

Returns a `network` object with properties:

* `network.activeConnections` - number of peers connected
* `network.on('listening')` - emitted with network is listening
* `network.on('connection', connection, info)` - Emitted when you connect to another peer. Info is an object that contains info about the connection

##### Network Options

`opts` are passed to discovery-swarm, which can include:

```js
opts = {
  upload: true, // announce and upload data to other peers
  download: true, // download data from other peers
  port: 3282, // port for discovery swarm
  utp: true, // use utp in discovery swarm
  tcp: true // use tcp in discovery swarm
}

//Defaults from datland-swarm-defaults can also be overwritten:

opts = {
  dns: {
    server: // DNS server
    domain: // DNS domain
  }
  dht: {
    bootstrap: // distributed hash table bootstrapping nodes
  }
}
```

Returns a [discovery-swarm](https://github.com/mafintosh/discovery-swarm) instance.

#### `dat.leaveNetwork()` or `dat.leave()`

Leaves the network for the archive.

#### `var importer = dat.importFiles([dir], [opts], [cb])`

**(must be the archive owner)**

Import files to your Dat Archive from the directory using [hyperdrive-import-files](https://github.com/juliangruber/hyperdrive-import-files/).

* `dir` - By default, files will be imported from the folder where the archive was initiated. Import files from another directory by specifying `dir`.
* `opts` - options passed to hyperdrive-import-files (see below).
* `cb` - called when import is finished.

Returns a `importer` object with properties:

* `importer.on('error', err)`
* `importer.on('file imported', { path, mode=updated|created })` - file imported
* `importer.on('file skipped', { path })` - duplicate file in directory skipped importing
* `importer.on('file watch event', { path })` - file watch event fired
* `importer.fileCount` - the count of currently known files
* `importer.totalSize` - total file size in bytes for `fileCount` files
* `importer.bytesImported` - total number of bytes imported so far
* `importer.countStats.files` - total number of files counted in target directory
* `importer.countStats.bytes` - total number of bytes in target directory.

##### Importer Progress

To get import progress use:

* `importer.fileCount / importer.countStats.files` for file progress
* `importer.bytesImported / importer.countStats.bytes` for byte progress

##### Importer Options

Options include:

```js
var opts = {
  ignoreHidden: true, // ignore hidden files  (if false, .dat will still be ignored)
  useDatIgnore: true, // ignore entries in the `.datignore` file from import dir target.
  ignore: // (see below for default info) anymatch expression to ignore files
  watch: false, // watch files for changes & import on change (archive must be live)
  overwrite: true, // allow files in the archive to be overwritten (defaults to true)
  resume: false, // assume the archive isn't fresh
  basePath: '', // where in the archive should the files import to? (defaults to '')
  dryRun: false, // step through the import, but don't write any files to the archive (defaults to false)
  indexing: true // Useful if target === dest so hyperdrive does not rewrite the files on import. (defaults to true if target === dest)
  compareFileContent: false // compare import-candidates to archive's internal copy. If false, will only compare mtime and file-size, which is faster but may reslt in false-positives.
}
```

##### Ignoring Files

`dat-node` provides a default ignore option, ignoring the `.dat` folder and all hidden files or directories. Use `opts.ignoreHidden = false` to import hidden files or folders, except the `.dat` directory.

Additionally, you can use a `.datignore` file to ignore any the user specifies. This is done by default.

*It's important that the `.dat` folder is not imported because it contains a private key that allows the owner to write to the archive.*

#### `var stats = dat.trackStats()`

[hyperdrive-stats](https://github.com/juliangruber/hyperdrive-stats) instance for the Dat Archive. Stats are stored in a sublevel database in the `.dat` folder.

##### `stats.network`

Get upload and download speeds: `stats.network.uploadSpeed` or `stats.network.downloadSpeed`. Transfer speeds are tracked using [hyperdrive-network-speed](https://github.com/joehand/hyperdrive-network-speed/).

##### `var peers = stats.peers`

* `peers.total` - total number of connected peers
* `peers.complete` - connected peers with all the content data
* `peers.downloadingFrom` - connected peers the user has downloaded data from

#### `dat.pause()`

Pause all upload & downloads. Currently, this is the same as `dat.leaveNetwork()`, which leaves the network and destroys the swarm. Discovery will happen again on `resume()`.

#### `dat.resume()`

Resume network activity. Current, this is the same as `dat.joinNetwork()`.

#### `dat.close(cb)`

Stops replication and closes all the things opened for dat-node, including:

* `dat.archive.close(cb)`
* `dat.db.close(cb)`
* `dat.network.close(cb)`
* `dat.importer.close()` (file watcher)

If you passed `opts.db`, you'll be responsible for closing it.

### Advanced Usage

### Multiple Archives

Check out the [multidat module](https://github.com/yoshuawuyts/multidat) with dat-node to manage many archives in one place.

### One Swarm - Many Connections

**TODO** - Use a single swarm to manage many connections (hyperdiscovery is  1 swarm to 1 archive).

## Moving from dat-js

#### dat-js -> dat-node

Dat-node was previously published as dat-js.

* Dat-node ^0.1.0 is compatible with dat-js ^4.0.0
* Dat-node 1.0.0 uses a new API. See details below for how to move from the old dat-js API.

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

## Contributing

* Use [standardjs](http://standardjs.com/) formatting
* `npm test` to run the tests
* Have fun!

### Tour de Code

* `index.js` validates the arguments and initializes the archive with `lib/init-archive.js`
* `dat.js` contains the `dat` class that is returned with the main callback.
* `lib/*` contains opinionated wrappers around the modules we use (with the exception of `lib/init-archive.js`). Some of this may move into the modules themselves eventually (or into `dat.js`).

#### `lib/import-files.js` 

* sets default ignore options.
* counts the files in target import directory for progress calculations

#### `lib/stats.js`

* Creates a sublevel database for hyperdrive-stats persistence
* Combines hyperdrive-stats and hyperdrive-network-speed into one interface.

#### `lib/network.js`

* Honestly doesn't do anything anymore. Could probably remove at this point =).

#### `lib/init-archive.js`

* This is a temporary workaround for resuming existing archives. It looks pretty confusing, and it is.
* Hyperdrive is moving to a one database = one archive model. Once updated, that change will eliminate the need for most of this file.

## License

MIT

[0]: https://img.shields.io/npm/v/dat-node.svg?style=flat-square
[1]: https://npmjs.org/package/dat-node
[2]: https://img.shields.io/travis/datproject/dat-node/master.svg?style=flat-square
[3]: https://travis-ci.org/datproject/dat-node
[4]: https://img.shields.io/codecov/c/github/datproject/dat-node/master.svg?style=flat-square
[5]: https://codecov.io/github/datproject/dat-node
