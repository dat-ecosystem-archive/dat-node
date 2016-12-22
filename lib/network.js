var assert = require('assert')
var hyperdiscovery = require('hyperdiscovery')

module.exports = function (archive, opts) {
  assert.ok(archive, 'lib/network archive required')
  opts = opts || {}

  var swarm = hyperdiscovery(archive, opts)
  swarm.options = swarm.options || opts
  return swarm
}
