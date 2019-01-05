var assert = require('assert')
var swarmDefaults = require('dat-swarm-defaults')
var disc = require('discovery-swarm')

module.exports = function (archive, opts, cb) {
  assert.ok(archive, 'dat-node: lib/network archive required')
  assert.ok(opts, 'dat-node: lib/network opts required')

  var DEFAULT_PORT = 3282
  var swarmOpts = Object.assign({
    hash: false,
    stream: opts.stream
  }, opts)
  var swarm = disc(swarmDefaults(swarmOpts))
  swarm.once('error', function () {
    swarm.listen(0)
  })
  swarm.listen(opts.port || DEFAULT_PORT)
  swarm.join(archive.discoveryKey, { announce: !(opts.upload === false) }, cb)
  swarm.options = swarm._options
  return swarm
}
