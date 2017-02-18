var assert = require('assert')
var swarmDefaults = require('datland-swarm-defaults')
var disc = require('discovery-swarm')

module.exports = function (archive, opts) {
  assert.ok(archive, 'dat-node: lib/network archive required')
  assert.ok(opts, 'dat-node: lib/network opts required')

  var DEFAULT_PORT = 3282
  opts.uploading = !(opts.upload === false)
  opts.downloading = !(opts.download === false)
  opts.id = archive.id
  opts.hash = false
  opts.stream = opts.stream

  var swarm = disc(swarmDefaults(opts))
  swarm.once('error', function () {
    swarm.listen(0)
  })
  swarm.listen(opts.port || DEFAULT_PORT)
  swarm.join(archive.discoveryKey, { announce: opts.uploading })
  swarm.options = swarm._options
  return swarm
}
