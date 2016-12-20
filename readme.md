# dat-node 1.0 alpha [![Travis](https://img.shields.io/travis/datproject/dat-node.svg?branch=1.0&style=flat-square)](https://travis-ci.org/datproject/dat-node)

Node module for Dat (replaces dat-js). 

Create Dat Archives with a `.dat` folder. Join the Dat Network. Track stats and import files.

#### Features

* Consistent management of `.dat` folders across modules, cli, apps using [dat-folder-db](https://github.com/joehand/dat-folder-db)
* Join Dat Network using [hyperdiscovery](https://github.com/karissa/hyperdiscovery)
* Track archive stats using [hyperdrive-stats](https://github.com/juliangruber/hyperdrive-stats)
* Import files from using [hyperdrive-import-files](https://github.com/juliangruber/hyperdrive-import-files/)

## Usage

Use to create or read Dat Archives on the file system in Node applications.

```js
var Dat = require('dat-node')

Dat(dir, opts, function (err, dat) {
  console.log(dat.path) // dat is created here with a .dat folder

  var db = dat.db // level db in .dat folder
  var archive = dat.archive // hyperdrive archive

  // Join the network
  var network = dat.joinNetwork(opts)
  network.swarm // hyperdiscovery

  // Track stats
  var stats = dat.trackStats() // hyperdrive-stats

  // Import Files
  if (archive.owner) {
    var importer = dat.importFiles(opts, cb) // hyperdrive-count-import
  }
})
```

### Moving from *dat-js*:

Archives are created with a callback function. Once the archive is created, you can join the network directly without choosing to share or download. If the user owns the archive, they will be able to import files.

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

## API

### `Dat(dir, [opts], cb)``

Initialize a Dat Archive in `dir`. If there is an existing Dat Archive, the archive will be resumed.

Initial `opts` can include:

```js
opts = {
  db: level(path/.dat), // level-db compatible database
  key: '<dat-key>', // existing key to create archive with or resume
  resume: Boolean, // fail if existing archive differs from opts.key

  // Hyperdrive archive options
  live: Boolean, // archive.live setting (only set if archive is owned)
  file: raf(), // file option for hyperdrive.createArchive()

  // dat-folder-db options
  dbName: '.dat' // directory name for level database
}
```

The callback includes a `dat` object that has the following properties:

#### `dat.archive`

Hyperdrive archive instance.

#### `dat.db`

`.dat` folder database

#### `dat.path`

Path of the Dat Archive

**`dat-node` provides an easy interface to common Dat modules for the created Dat Archive on the `dat` object provided in the callback:**

#### `var network = dat.joinNetwork([opts])`

Join the Dat Network for your Dat Archive.

`opts` are passed to the swarm module. See [hyperdiscovery](https://github.com/karissa/hyperdiscovery) for options.

##### `network.swarm`

[discovery-swarm](https://github.com/mafintosh/discovery-swarm) instance.

##### `network.peers()`

Get number of peers connected to you.

#### `var importer = dat.importFiles([opts], [cb])`

(must be the archive owner)

Import files to your Dat Archive from the directory using [hyperdrive-import-files](https://github.com/juliangruber/hyperdrive-import-files/). Options are passed to the importer module. `cb` is called when import is finished.

`dat-node` provides a default ignore option, ignoring the `.dat` folder and all hidden files or directories.

Returns the importer event emitter.

#### `var stats = dat.trackStats()`

[hyperdrive-stats](https://github.com/juliangruber/hyperdrive-stats) instance for the Dat Archive. Stats are stored in a sublevel database in the `.dat` folder.

Transfer speeds are tracked using [hyperdrive-network-speed](https://github.com/joehand/hyperdrive-network-speed/) and exposed to `stats.network`..

##### `stats.network`

Get upload and download speeds: `stats.network.uploadSpeed` or `stats.network.downloadSpeed`.
