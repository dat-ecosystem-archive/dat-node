# Dat-js [![Travis](https://api.travis-ci.org/joehand/dat-js.svg)](https://travis-ci.org/joehand/dat-js) [![npm](https://img.shields.io/npm/v/dat-js.svg?style=flat-square)](https://npmjs.org/package/dat-js)

[<img src="https://raw.githubusercontent.com/datproject/design/master/downloads/dat-data-logo.png" align="right" width="140">](http://dat-data.com)

[Dat](https://dat-data.com) is a decentralized data tool for distributing data and files. **Dat-js** is a node module to help you build applications with Dat. Do you want to use Dat in the command line? Check out the command line interface at [datproject/dat](https://github.com/datproject/dat).

**Chat with us!**   [![#dat IRC channel on freenode](https://img.shields.io/badge/irc%20channel-%23dat%20on%20freenode-blue.svg)](http://webchat.freenode.net/?channels=dat)
[![datproject/discussions](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/datproject/discussions?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![JavaScript Style Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## Table of Contents

- [Examples](#examples)
- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Contribute](#contribute)
- [License](#license)

## Examples

Share files with Dat:

```js
var Dat = require('dat-js')

var dat = Dat({dir: process.cwd()})
dat.share(function (err) {
  if (err) throw err
  // This may take awhile for large directories
  console.log('Current directory being shared via Dat!')
  console.log('Download via: ', dat.key.toString('hex'))
})
```

Download files with Dat:

```js
var Dat = require('dat-js')

// Add download key as the second argument
var dat = Dat({dir: process.cwd(), key: process.argv[2]})
dat.download()
dat.on('download-finished', function (err) {
  if (err) throw err
  console.log('Finished downloading!')
})
```

## Installation

```
npm install dat-js
```

## Usage

Dat-js provides an interface for sharing and downloading files, like we do in the Dat command line tool. Dat-js works great if you want to manage Dat folders in a way that is compatible with the Dat CLI and other Dat tools.

Dat-js works the same way as the command line tool. There are two basic operations:

* Sharing: share a directory to a key
* Downloading: download files from a key into a directory

Dat-js will create a `.dat` folder in the directory you specify with the `dir` option. This allows you to resume the share or download later using the Dat command line tool, or another Dat-compatible application.

Whenever you initiate Dat you need to specify at least the directory.

```js
var Dat = require('dat-js')
var dat = Dat({dir: 'some-path'})
```

By default, Dat-js assumes you are creating a new Dat. If you are using a dat created by other user, you need to specify the key too:

```js
var Dat = require('dat-js')
var dat = Dat({dir: 'some-path', key:'some64characterdatkey'})
```

From there, you can either share or download: `dat.share(cb)` or `dat.download(cb)`. That's it! Read below for the full API and options.

## API

The main goal of the API is to support the Dat command line tool. The options here should be familiar if you use the command line tool. 

### Options

```js
{
  key: '64characterDatkey', // required for downloads
  dir: 'downloads/path-to-dir/', // path to share or download to. required
  dat.snapshot: false, //: sharing snapshot archive, not used for download
  dat.watchFiles: true, // watch files for changes. Archive needs to be live. Defaults to same value as archive.live.
  dat.discovery: true, // join discovery swarm when ready
  dat.port: 3828, // port to use for discovery-swarm
  dat.utp: true, // use utp for discovery-swarm
  dat.db: '.dat' // database instance, uses .dat folder by default
}
```

### dat.download(cb)

Download `dat.key` to `dat.dir`. Does not callback for live archives.

### dat.share(cb) 

Share directory specified in `opts.dir`. Callback fired when all files are added to the drive (files will start being shared as they are added for live archives). The swarm is automatically joined for key when it is available for share & download, specify `discovery: false` to not join the swarm automatically.

### dat.open(cb)

Open is called automatically for share and resume. It may be helpful to call it manually if you want to check for an existing Dat before sharing/downloading. Opens a Dat in the directory. This looks for an existing `.dat` directory. If `.dat` directory exists, resumes previous Dat. If not, it will create a new Dat.

### `dat.archive`

Hyperdrive archive instance.

### `dat.live`

Dat is live. When downloading, this will be set to the true if the remote Dat is live, regardless of `snapshot` option.

### `dat.resume`

Previous dat resumed. Populated after `dat.open`.

### Events

#### Share Events

* `dat.on('key')`: key is available (this is at archive-finalized for snapshots)
* `dat.on('file-counted', file)`: file counted
* `dat.on('files-counted', stats)`: total file count available, this fires before files are added to archive
* `dat.on('file-added', file)`: file added to archive
* `dat.on('upload', data)`: piece of data uploaded
* `dat.on('archive-finalized')`: archive finalized, all files appended
* `dat.on('archive-updated')`: live archive changed

#### Download Events

* `dat.on('key')`: key is available
* `dat.on('file-downloaded', file)`: file downloaded
* `dat.on('download', data)`: piece of data downloaded
* `dat.on('upload', data)`: piece of data uploaded
* `dat.on('download-finished')`: archive download finished

#### Swarm Events

Swarm events and stats are available from `dat.swarm`.

* `dat.on('connecting')`: looking for peers
* `dat.on('swarm-update')`: peer connect/disconnect

#### Internal Stats

Stats we track internally for progress displays. It is not recommended to use these currently.

```js
dat.stats = {
    filesProgress: 0,
    bytesProgress: 0,
    filesTotal: 0,
    bytesTotal: 0,
    bytesUp: 0,
    bytesDown: 0
}
```

## Contribute

Contributions are welcome! Currently we plan to limit the feature set to features used in the [Dat CLI](https://github.com/datproject/dat).

Read about contribution and node module development tips in the [dat repository](https://github.com/datproject/dat/blob/master/CONTRIBUTING.md).

## License

MIT © Joe Hand