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
* `dat.dir`: directory
* `dat.datPath`: path to .dat folder
* `dat.db`: database instance
* `dat.swarm`: hyperdrive-archive-swarm instance
* `dat.port`: port to use for discovery-swarm
* `dat.utp`: use utp for discovery-swarm
* `dat.archive`: hyperdrive archive
* `dat.snapshot` (boolean): sharing snapshot archive
* `dat.discovery` (boolean): join discovery swarm
* `dat.watchFiles` (boolean): whether to watch files live. Archive needs to be live. Defaults to same value as archive.live.

### dat.download(cb)

download `dat.key` to `dat.dir`

### dat.share(cb) 

share directory specified in `opts.dir`

Swarm is automatically joined for key when it is available for share & download.

## Events

### Initialization

* `dat.on('ready')`: db created/read & hyperdrive archive created.
* `dat.on('error')`: database error

### Swarm

Swarm events and stats are available from `dat.swarm`.

* `dat.on('connecting')`: looking for peers
* `dat.on('swarm-update')`: peer number changed

### Share

* `dat.on('key')`: key is available (this is at archive-finalized for snapshots)
* `dat.on('append-ready')`: file count available (`dat.appendStats`), about to start appending to hyperdrive
* `dat.on('file-added')`: file added to archive
* `dat.on('upload', data)`: piece of data uploaded
* `dat.on('archive-finalized')`: archive finalized, all files appended
* `dat.on('archive-updated')`: live archive changed

### Download

* `dat.on('key')`: key is available
* `dat.on('file-downloaded', file)`: file downloaded
* `dat.on('download', data)`: piece of data downloaded
* `dat.on('upload', data)`: piece of data uploaded
* `dat.on('download-finished')`: archive download finished

#### Internal Stats

```javascript

dat.stats = {
    filesProgress: 0,
    bytes: progress: 0,
    filesTotal: 0,
    bytesTotal: 0,
    bytesUp: 0,
    bytesDown: 0,
    rateUp: speedometer(),
    rateDown: speedometer()
}
```