const assert = require('assert')
const http = require('http')
const serve = require('hyperdrive-http')
const debug = require('debug')('dat-node')

module.exports = function (archive, opts) {
  assert.ok(archive, 'lib/serve: archive required')
  opts = Object.assign({
    port: 8080,
    live: true,
    footer: 'Served via Dat.'
  }, opts)

  const server = http.createServer(serve(archive, opts))
  server.listen(opts.port)
  server.on('listening', function () {
    debug(`http serving on PORT:${opts.port}`)
  })

  return server
}
