# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) 
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]
*Note: unreleased changes are added here.*
<!-- Change types:
  ### Added, ### Changed, ### Fixed, ### Removed, ### Deprecated
-->

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
