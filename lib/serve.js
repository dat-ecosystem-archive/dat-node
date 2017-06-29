var assert = require('assert')
var http = require('http')
var serve = require('hyperdrive-http')
var xtend = require('xtend')
var debug = require('debug')('dat-node')

module.exports = function (archive, opts) {
  assert.ok(archive, 'lib/serve: archive required')
  opts = xtend({
    port: 8080,
    live: true,
    footer: 'Served via Dat.'
  }, opts)

  var server = http.createServer(serve(archive, opts))
  server.listen(opts.port)
  server.on('listening', function () {
    debug(`http serving on PORT:${opts.port}`)
  })

  return server
}
