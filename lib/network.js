var assert = require('assert')
var createSwarm = require('hyperdiscovery')

module.exports = function (archive, opts) {
  assert.ok(archive, 'lib/network archive required')

  var swarm = createSwarm(archive, opts)
  return {
    swarm: swarm,
    options: opts || {},
    peers: function () {
      return swarm.connections.length
    }
  }
}
