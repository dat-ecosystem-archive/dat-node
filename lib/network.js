var assert = require('assert')
var hyperdiscovery = require('hyperdiscovery')

module.exports = function (archive, opts) {
  assert.ok(archive, 'lib/network archive required')
  opts = opts || {}

  var swarm = hyperdiscovery(archive, opts)
  var network = {
    swarm: swarm,
    options: swarm.options || opts
  }

  network.__defineGetter__('connected', function () {
    return swarm.connected
  })

  return network
}
