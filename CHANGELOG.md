# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) 
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]
*Note: unreleased changes are added here.*
<!-- Change types:
  ### Added, ### Changed, ### Fixed, ### Removed, ### Deprecated
-->

## 0.1.1 - 2016-11-29
### Fixed
* Populate `dat.key` after archive opened ([#43](https://github.com/datproject/dat-node/pull/43))

### Changed
* Use hyperdiscovery instead of hyperdrive-archive-swarm ([#45](https://github.com/datproject/dat-node/pull/45))

## 0.1.0 - 2016-11-17
Released `dat-js` 4.0 as `dat-node` 0.1.

## Moved to dat-node.
*dat-node 0.1.0 === dat-js 4.0.0*

## 4.0.0 - 2016-11-16
*This will be the last major version of dat-js. This library will be moving to dat-fs, with a similar API.*

### Removed
* webrtc support (`opts.webrtc`, `opts.signalhub`)
* `opts.upload` changed to `opts.discovery.upload` (deprecated in 3.4.0)

### Fixed
* Error message for trying to download a dat to folder with existing dat.


## 3.8.2 - 2016-11-15
### Fixed
* Check type of keys on db resume

## 3.8.1 - 2016-11-15
### Fixed
* Progress incorrectly showing 100% with 0 bytes

## 3.8.0 - 2016-11-07
### Added
* Expose `dat.owner`, `dat.key`, `dat.peers`
* Support buffer keys
* Forward `db.open` errors

### Fixed
* Guard `archive.close` on `dat.close`

## 3.7.1 - 2016-10-29
### Fixed
* Create entryDone function once for downloads

## 3.7.0 - 2016-10-29
### Fixed
* Download file count for duplicate files

### Removed
* `stats.bytesProgress` on downloads

### Changed
* Upgrade to hyperdrive 7.5.0
* Use archive.blocks for stats on download with new hyperdrive functions.

## 3.6.0 - 2016-09-27
### Added
* `signalhub` option.

## 3.5.0 - 2016-09-22
### Added
* `opts.ignoreHidden` ignores hidden directories by default.

## 3.4.0 - 2016-09-14
### Changed
* Accept object for discovery: `{upload: true, download: true}`.

### Deprecated
* `upload` option (moved to `discovery.upload`). Will be removed in 4.0.0.

## 3.3.1 - 2016-09-06
### Fixed
* Emit `files-counted` event on Dat instance
* Include `stats` object on `file-counted` event

## 3.3.0 - 2016-09-06
### Added
* Add `webrtc` option

## 3.2.0 - 2016-09-01
### Added
* Upload option. `upload=false` will not upload data (allows download only option)

## 3.1.0 - 2016-09-01
### Added
* User `opts.ignore` extends default opts.

### Fixed
* Default ignore does not ignore files with .dat in them.

## 3.0.2 - 2016-08-26
### Fixed
* Default ignore config to ignore only `.dat` folder and files inside.

## 3.0.1 - 2016-08-18
### Fixed
* Fix hyperdrive-import-files bug on sharing directories

## 3.0.0 - 2016-08-18
### Added
* `dat.open()` function to initialize the `.dat` folder

### Removed
* `dat.on('ready')` event for initialization


## 2.x.x and earlier

* Port `lib/dat.js` file from the [Dat CLI](https://github.com/datproject/dat) library.

### Changed
* Use hyperdrive-import-files to import files on share