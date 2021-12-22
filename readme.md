[![deprecated](http://badges.github.io/stability-badges/dist/deprecated.svg)](https://dat-ecosystem.org/) 

More info on active projects and modules at [dat-ecosystem.org](https://dat-ecosystem.org/) <img src="https://i.imgur.com/qZWlO1y.jpg" width="30" height="30" /> 

---

# dat-node

> **dat-node** is a high-level module for building Dat applications on the file system.

[![npm][0]][1] [![Travis][2]][3] [![Test coverage][4]][5] [![Greenkeeper badge](https://badges.greenkeeper.io/datproject/dat-node.svg)](https://greenkeeper.io/)

**For a lower-level API for building your own applications, use the [Dat SDK](https://github.com/datproject/sdk) which works in Node and the Web**

#### Compatibility

Note: Version 4 of `dat-node` is not compatible with earlier versions (3.5.15
and below). 

#### Dat Project Documentation & Resources

* [dat project Docs](http://docs.datproject.org/)
* [dat protocol](https://www.datprotocol.com/)
* Chat on [Gitter](https://gitter.im/datproject/discussions) or [#dat on IRC](http://webchat.freenode.net/?channels=dat)

### Features

* High-level glue for common dat:// and [hyperdrive](https://github.com/mafintosh/hyperdrive) modules.
* Sane defaults and consistent management of storage & secret keys across applications, using [dat-storage](https://github.com/datproject/dat-storage).
* Easily connect to the dat:// network with holepunching, using [hyperswarm](https://github.com/hyperswarm)
* Import files from the file system, using [mirror-folder](https://github.com/mafintosh/mirror-folder/)
* Serve dats over http with [hyperdrive-http](https://github.com/joehand/hyperdrive-http)
* Access APIs to lower level modules with a single `require`!

#### Browser Support

Many of our dependencies work in the browser, but `dat-node` is tailored for file system applications. See [dat-sdk](https://github.com/datproject/sdk) if you want to build browser-friendly applications.

## Example

To send files via dat:

1. Tell dat-node where the files are.
2. Import the files.
3. Share the files on the dat network! (And share the link)

```js
var Dat = require('dat-node')

// 1. My files are in /joe/cat-pic-analysis
Dat('/joe/cat-pic-analysis', function (err, dat) {
  if (err) throw err

  // 2. Import the files
  dat.importFiles()

  // 3. Share the files on the network!
  dat.joinNetwork()
  // (And share the link)
  console.log('My Dat link is: dat://' + dat.key.toString('hex'))
})
```

These files are now available to share over the dat network via the key printed in the console.

To download the files, you can make another dat-node instance in a different folder. This time we also have three steps:

1. Tell dat where I want to download the files.
2. Tell dat what the link is.
3. Join the network and download!

```js
var Dat = require('dat-node')

// 1. Tell Dat where to download the files
Dat('/download/cat-analysis', {
  // 2. Tell Dat what link I want
  key: '<dat-key>' // (a 64 character hash from above)
}, function (err, dat) {
  if (err) throw err

  // 3. Join the network & download (files are automatically downloaded)
  dat.joinNetwork()
})
```

That's it! By default, all files are automatically downloaded when you connect to the other users.

Dig into more use cases below and please let us know if you have questions! You can [open a new issue](https://github.com/datproject/dat-node/issues) or talk to nice humans in [our chat room](https://gitter.im/datproject/discussions).

### Example Applications

* [CLI](https://github.com/datproject/dat): We use dat-node in the dat CLI.
* [Desktop](https://github.com/datproject/dat-desktop): The Dat Desktop application manages multiple dat-node instances via [dat-worker](https://github.com/juliangruber/dat-worker).
* See the [examples folder](examples) for a minimal share + download usage.
* And more! Let us know if you have a neat dat-node application to add here.

## Usage

All dat-node applications have a similar structure around three main elements:

1. **Storage** - where the files and metadata are stored.
2. **Network** - connecting to other users to upload or download data.
3. **Adding Files** - adding files from the file system to the hyperdrive archive.

We'll go through what these are for and a few of the common usages of each element.

### Storage

Every dat archive has **storage**, this is the required first argument for dat-node. By default, we use [dat-storage](http://github.com/datproject/dat-storage) which stores the secret key in `~/.dat/` and the rest of the data in `dir/.dat`. Other common options are:

* **Persistent storage**: Stored files in `/my-dir` and metadata in `my-dir/.dat` by passing `/my-dir` as the first argument.
* **Temporary Storage**: Use the `temp: true` option to keep metadata stored in memory.

```js
// Permanent Storage
Dat('/my-dir', function (err, dat) {
  // Do Dat Stuff
})

// Temporary Storage
Dat('/my-dir', {temp: true}, function (err, dat) {
  // Do Dat Stuff
})
```

Both of these will import files from `/my-dir` when doing `dat.importFiles()` but only the first will make a `.dat` folder and keep the metadata on disk.

The storage argument can also be passed through to hyperdrive for more advanced storage use cases.

### Network

Dat is all about the network! You'll almost always want to join the network right after you create your Dat:

```js
Dat('/my-dir', function (err, dat) {
  dat.joinNetwork()
  dat.network.on('connection', function () {
    console.log('I connected to someone!')
  })
})
```

#### Downloading Files

Remember, if you are downloading - metadata and file downloads will happen automatically once you join the network!

dat runs on a peer to peer network, sometimes there may not be anyone online for a particular key. You can make your application more user friendly by using the callback in `joinNetwork`:

```js
// Downloading <key> with joinNetwork callback
Dat('/my-dir', {key: '<key>'}, function (err, dat) {
  dat.joinNetwork(function (err) {
    if (err) throw err

    // After the first round of network checks, the callback is called
    // If no one is online, you can exit and let the user know.
    if (!dat.network.connected || !dat.network.connecting) {
      console.error('No users currently online for that key.')
      process.exit(1)
    }
  })
})
```

##### Download on Demand

If you want to control what files and metadata are downloaded, you can use the sparse option:

```js
// Downloading <key> with sparse option
Dat('/my-dir', {key: '<key>', sparse: true}, function (err, dat) {
  dat.joinNetwork()

  // Manually download files via the hyperdrive API:
  dat.archive.readFile('/cat-locations.txt', function (err, content) {
    console.log(content) // prints cat-locations.txt file!
  })
})
```

Dat will only download metadata and content for the parts you request with `sparse` mode!

### Importing Files

There are many ways to get files imported into an archive! Dat node provides a few basic methods. If you need more advanced imports, you can use the `archive.createWriteStream()` methods directly.

By default, just call `dat.importFiles()` to import from the directory you initialized with. You can watch that folder for changes by setting the watch option:

```js
Dat('/my-data', function (err, dat) {
  if (err) throw err

  var progress = dat.importFiles({watch: true}) // with watch: true, there is no callback
  progress.on('put', function (src, dest) {
    console.log('Importing ', src.name, ' into archive')
  })
})
```

You can also import from another directory:

```js
Dat('/my-data', function (err, dat) {
  if (err) throw err

  dat.importFiles('/another-dir', function (err) {
    console.log('done importing another-dir')
  })
})
```

That covers some of the common use cases, let us know if there are more to add! Keep reading for the full API docs.

## API

### `Dat(dir|storage, [opts], callback(err, dat))`

Initialize a Dat Archive in `dir`. If there is an existing Dat Archive, the archive will be resumed.

#### Storage

* `dir` (Default) - Use [dat-storage](https://github.com/datproject/dat-storage) inside `dir`. This stores files as files, sleep files inside `.dat`, and the secret key in the user's home directory.
* `dir` with `opts.latest: false` - Store as SLEEP files, including storing the content as a `content.data` file. This is useful for storing all history in a single flat file.
* `dir` with `opts.temp: true` - Store everything in memory (including files).
* `storage` function - pass a custom storage function along to hyperdrive, see dat-storage for an example.

Most options are passed directly to the module you're using (e.g. `dat.importFiles(opts)`. However, there are also some initial `opts` can include:

```js
opts = {
  key: '<dat-key>', // existing key to create archive with or resume
  temp: false, // Use random-access-memory as the storage.

  // Hyperdrive options
  sparse: false // download only files you request
}
```

The callback, `cb(err, dat)`, includes a `dat` object that has the following properties:

* `dat.key`: key of the dat (this will be set later for non-live archives)
* `dat.archive`: Hyperdrive archive instance.
* `dat.path`: Path of the Dat Archive
* `dat.live`: `archive.live`
* `dat.writable`: Is the `archive` writable?
* `dat.resumed`: `true` if the archive was resumed from an existing database
* `dat.options`: All options passed to Dat and the other submodules

### Module Interfaces

**`dat-node` provides an easy interface to common Dat modules for the created Dat Archive on the `dat` object provided in the callback:**

#### `var network = dat.joinNetwork([opts], [cb])`

Join the network to start transferring data for `dat.key`, using [discovery-swarm](https://github.com/mafintosh/discovery-swarm). You can also use `dat.join([opts], [cb])`.

If you specify `cb`, it will be called *when the first round* of discovery has completed. This is helpful to check immediately if peers are available and if not fail gracefully, more similar to http requests.

Returns a `network` object with properties:

* `network.connected` - number of peers connected
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

#### `var importer = dat.importFiles([src], [opts], [cb])`

**Archive must be writable to import.**

Import files to your Dat Archive from the directory using [mirror-folder](https://github.com/mafintosh/mirror-folder/).

* `src` - By default, files will be imported from the folder where the archive was initiated. Import files from another directory by specifying `src`.
* `opts` - options passed to mirror-folder (see below).
* `cb` - called when import is finished.

Returns a `importer` object with properties:

* `importer.on('error', err)`
* `importer.on('put', src, dest)` - file put started. `src.live` is true if file was added by file watch event.
* `importer.on('put-data', chunk)` - chunk of file added
* `importer.on('put-end', src, dest)` - end of file write stream
* `importer.on('del', dest)` - file deleted from dest
* `importer.on('end')` - Emits when mirror is done (not emitted in watch mode)
* If `opts.count` is true:
  * `importer.on('count', {files, bytes})` - Emitted after initial scan of src directory. See import progress section for details.
  * `importer.count` will be `{files, bytes}` to import after initial scan.
  * `importer.putDone` will track `{files, bytes}` for imported files.

##### Importer Options

Options include:

```js
var opts = {
  count: true, // do an initial dry run import for rendering progress
  ignoreHidden: true, // ignore hidden files  (if false, .dat will still be ignored)
  ignoreDirs: true, // do not import directories (hyperdrive does not need them and it pollutes metadata)
  useDatIgnore: true, // ignore entries in the `.datignore` file from import dir target.
  ignore: // (see below for default info) anymatch expression to ignore files
  watch: false, // watch files for changes & import on change (archive must be live)
}
```

##### Ignoring Files

You can use a `.datignore` file in the imported directory, `src`, to ignore any the user specifies. This is done by default.

`dat-node` uses [dat-ignore](https://github.com/joehand/dat-ignore) to provide a default ignore option, ignoring the `.dat` folder and all hidden files or directories. Use `opts.ignoreHidden = false` to import hidden files or folders, except the `.dat` directory.

*It's important that the `.dat` folder is not imported because it contains a private key that allows the owner to write to the archive.*

#### `var stats = dat.trackStats()`

##### `stats.on('update')`

Emitted when archive stats are updated. Get new stats with `stats.get()`.

##### `var st = stats.get()`

`dat.trackStats()` adds a `stats` object to `dat`.  Get general archive stats for the latest version:

```js
{
  files: 12,
  byteLength: 1234,
  length: 4, // number of blocks for latest files
  version: 6, // archive.version for these stats
  downloaded: 4 // number of downloaded blocks for latest
}
```

##### `stats.network`

Get upload and download speeds: `stats.network.uploadSpeed` or `stats.network.downloadSpeed`. Transfer speeds are tracked using [hyperdrive-network-speed](https://github.com/joehand/hyperdrive-network-speed/).

##### `var peers = stats.peers`

* `peers.total` - total number of connected peers
* `peers.complete` - connected peers with all the content data

#### `var server = dat.serveHttp(opts)`

Serve files over http via [hyperdrive-http](https://github.com/joehand/hyperdrive-http). Returns a node http server instance.

```js
opts = {
  port: 8080, // http port
  live: true, // live update directory index listing
  footer: 'Served via Dat.', // Set a footer for the index listing
  exposeHeaders: false // expose dat key in headers
}
```

#### `dat.pause()`

Pause all upload & downloads. Currently, this is the same as `dat.leaveNetwork()`, which leaves the network and destroys the swarm. Discovery will happen again on `resume()`.

#### `dat.resume()`

Resume network activity. Current, this is the same as `dat.joinNetwork()`.

#### `dat.close(cb)`

Stops replication and closes all the things opened for dat-node, including:

* `dat.archive.close(cb)`
* `dat.network.close(cb)`
* `dat.importer.destroy()` (file watcher)

## License

MIT

[0]: https://img.shields.io/npm/v/dat-node.svg?style=flat-square
[1]: https://npmjs.org/package/dat-node
[2]: https://img.shields.io/travis/datproject/dat-node/master.svg?style=flat-square
[3]: https://travis-ci.org/datproject/dat-node
[4]: https://img.shields.io/codecov/c/github/datproject/dat-node/master.svg?style=flat-square
[5]: https://codecov.io/github/datproject/dat-node
