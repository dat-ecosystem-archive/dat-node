var createSwarm = require('hyperdrive-archive-swarm')

module.exports = function (archive, opts) {
  var swarm = createSwarm(archive, opts)

  return {
    swarm: swarm,
    start: swarm.join(archive.discoveryKey),
    stop: swarm.leave(archive.discoveryKey)
  }
}
