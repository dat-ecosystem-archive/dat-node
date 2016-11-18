# dat-node 1.0 alpha

Node module for Dat (replaces dat-js). 

Create Dat Archives with a `.dat` folder. Join the Dat Network. Track stats and import files.

#### Features

* Consistent management of `.dat` folders across modules, cli, apps using [dat-folder-db](https://github.com/joehand/dat-folder-db)
* Join Dat Network using [hyperdrive-archive-swarm](https://github.com/karissa/hyperdrive-archive-swarm)
* Track archive stats using [hyperdrive-stats](https://github.com/juliangruber/hyperdrive-stats)
* Import files from using [hyperdrive-import-files](https://github.com/juliangruber/hyperdrive-import-files/)

## Usage

Use to create or read Dat Archives on the file system in Node applications.

```js
var Dat = require('dat-node')

Dat(dir, opts, function (err, dat) {
  console.log(dat.path) // dat is created here with a .dat folder

  var db = dat.db // level db in .dat folder
  var archive = dat.archive // Dat Archive

  // Join the network
  var network = dat.network(opts) 
  network.swarm // hyperdrive-archive-swarm

  // Track stats
  var stats = dat.stats() // hyperdrive-stats

  // Import Files
  var importer = dat.importFiles(opts, cb) // hyperdrive-count-import
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

---

**`dat-node` provides an easy interface to common Dat modules for the created Dat Archive on the `dat` object provided in the callback:**

#### `var network = dat.network([opts])`

Join the Dat Network for your Dat Archive.

`opts` are passed to the swarm module. See [hyperdrive-archive-swarm](https://github.com/karissa/hyperdrive-archive-swarm) for options.

##### `network.peers()`

Get number of peers connected to you.

#### `var importer = dat.importFiles([opts], [cb])`

Import files to your Dat Archive from the directory using [hyperdrive-import-files](https://github.com/juliangruber/hyperdrive-import-files/). Options are passed to the importer module. `cb` is called when import is finished.

`dat-node` provides a default ignore option, ignoring the `.dat` folder and all hidden files or directories.

Returns the importer event emitter.

#### `var stats = dat.stats()`

[hyperdrive-stats](https://github.com/juliangruber/hyperdrive-stats) instance for the Dat Archive. Stats are stored in a sublevel database in the `.dat` folder.
