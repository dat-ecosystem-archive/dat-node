# dat-node 1.0 alpha

Node module for Dat (replaces dat-js). 

## Usage

```js
var createDat = require('dat-node')

createDat(dir, opts, function (err, dat) {
  var db = dat.db // level db in .dat folder
  var archive = dat.archive // hyperdrive

  // Join the network
  var network = dat.network(opts) 
  network.swarm // hyperdrive-archive-swarm

  // Track stats
  var stats = dat.stats() // hyperdrive-stats

  // Import Files
  var importer = dat.importFiles(opts, cb) // hyperdrive-count-import
})
```
