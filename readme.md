# Dat-js

Dat is a decentralized data tool for distributing data and files. **dat-js** is a javascript module to help you build applications with Dat.

* Dat CLI at [maxogden/dat](https://github.com/maxogden/dat).
* Dat Desktop
* Dat.land

[![#dat IRC channel on freenode](https://img.shields.io/badge/irc%20channel-%23dat%20on%20freenode-blue.svg)](http://webchat.freenode.net/?channels=dat)
[![datproject/discussions](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/datproject/discussions?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Travis](https://api.travis-ci.org/joehand/dat-js.svg)](https://travis-ci.org/joehand/dat-js)

# API

## Options

* `dat.key`: key
* `dat.dir`: directory to create `.dat` folder in and share/download
* `dat.snapshot` (boolean): sharing snapshot archive
* `dat.watchFiles` (boolean): whether to watch files live. Archive needs to be live. Defaults to same value as archive.live.
* `dat.discovery` (boolean): join discovery swarm when ready
* `dat.port`: port to use for discovery-swarm
* `dat.utp`: use utp for discovery-swarm
* `dat.db`: database instance, does not use .dat folder

### Default Options 

```js
defaultOpts = {
  snapshot: false,
  utp: true,
  ignore: [/\.dat\//],
  discovery: true,
  watchFiles: true
}
```

### dat.open(cb)

opens a dat. creates the .dat directory. if .dat directory exists, resumes previous dat. open is called automatically for share and resume.

### dat.download(cb)

download `dat.key` to `dat.dir`

### dat.share(cb) 

share directory specified in `opts.dir`

Swarm is automatically joined for key when it is available for share & download.

### `dat.archive` 

hyperdrive archive instance

### `dat.live`

Dat is live. Set for downloads to `archive.live`.

### `dat.resume`

previous dat resumed. only populated after `dat.open`.

## Events

### Share

* `dat.on('key')`: key is available (this is at archive-finalized for snapshots)
* `dat.on('file-counted', file)`: file counted
* `dat.on('files-counted', stats)`: file count available, about to start appending to hyperdrive
* `dat.on('file-added', file)`: file added to archive
* `dat.on('upload', data)`: piece of data uploaded
* `dat.on('archive-finalized')`: archive finalized, all files appended
* `dat.on('archive-updated')`: live archive changed

### Download

* `dat.on('key')`: key is available
* `dat.on('file-downloaded', file)`: file downloaded
* `dat.on('download', data)`: piece of data downloaded
* `dat.on('upload', data)`: piece of data uploaded
* `dat.on('download-finished')`: archive download finished

### Swarm

Swarm events and stats are available from `dat.swarm`.

* `dat.on('connecting')`: looking for peers
* `dat.on('swarm-update')`: peer connect/disconnect

#### Internal Stats

```javascript

dat.stats = {
    filesProgress: 0,
    bytes: progress: 0,
    filesTotal: 0,
    bytesTotal: 0,
    bytesUp: 0,
    bytesDown: 0
}
```