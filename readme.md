# Dat-js

Very WIP. See Dat CLI at https://github.com/maxogden/dat for now.

# Options

* `dir`
* `key`
* `datPath`: `.dat` folder location
* `db`
* `snapshot`
* `port`

# API

## dat.download(cb) download `opts.key` to `opts.dir`

## dat.share(cb) share directory specified in `opts.dir`

Swarm is automatically joined for key when it is available for share & download.


# Events

## Initialization

`dat.on('ready')`: db created/read & hyperdrive archive created.
`dat.on('error')`: database error

## Swarm

Swarm events and stats are available from `dat.swarm`.

* `dat.on('connecting')`: looking for peers
* `dat.on('swarm-update')`: peer number changed

## Share

`dat.on('key')`: key is available (this is at archive-finalized for snapshots)
`dat.on('append-ready')`: file count available (`dat.initStats`), about to start appending to hyperdrive
`dat.on('file-added')`: file added to archive
`dat.on('upload', data)`: piece of data uploaded
`dat.on('archive-finalized')`: archive finalized, all files appended
`dat.on('archive-updated')`: live archive changed

## Download

`dat.on('key')`: key is available
`dat.on('file-downloaded', file)`: file downloaded
`dat.on('download', data)`: piece of data downloaded
`dat.on('upload', data)`: piece of data uploaded
`dat.on('download-finished')`: key is available