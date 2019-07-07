const assert = require('assert')
const swarmDefaults = require('dat-swarm-defaults')
const disc = require('discovery-swarm')

module.exports = function (archive, opts, cb) {
  assert.ok(archive, 'dat-node: lib/network archive required')
  assert.ok(opts, 'dat-node: lib/network opts required')

  const DEFAULT_PORT = 3282
  const swarmOpts = Object.assign({
    hash: false,
    stream: opts.stream
  }, opts)
  const swarm = disc(swarmDefaults(swarmOpts))
  swarm.once('error', function () {
    swarm.listen(0)
  })
  swarm.listen(opts.port || DEFAULT_PORT)
  swarm.join(archive.discoveryKey, { announce: !(opts.upload === false) }, cb)
  swarm.options = swarm._options
  return swarm
}
