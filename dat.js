const assert = require('assert')
const path = require('path')

const untildify = require('untildify')
const importFiles = require('./lib/import-files')
const createNetwork = require('./lib/network')
const stats = require('./lib/stats')
const serveHttp = require('./lib/serve')
const debug = require('debug')('dat-node')

module.exports = (...args) => new Dat(...args)

class Dat {
  constructor (archive, opts) {
    assert.ok(archive, 'archive required')

    this.archive = archive
    this.options = Object.assign({}, opts)
    if (opts.dir) {
      this.path = path.resolve(untildify(opts.dir))
    }
  }

  get key () {
    return this.archive.key
  }

  get live () {
    return this.archive.live
  }

  get resumed () {
    return this.archive.resumed
  }

  get writable () {
    return this.archive.metadata.writable
  }

  get version () {
    return this.archive.version
  }

  join (opts) {
    const self = this
    if (!opts && self.options.network) opts = self.options.network // use previous options
    else opts = opts || {}

    return new Promise((resolve, reject) => {
      const netOpts = Object.assign({}, {
        stream: function (peer) {
          const stream = self.archive.replicate({
            upload: !(opts.upload === false),
            download: !self.writable && opts.download,
            live: !opts.end
          })
          stream.on('close', () => {
            debug('Stream close')
          })
          stream.on('error', (err) => {
            debug('Replication error:', err.message)
          })
          stream.on('end', () => {
            self.downloaded = true
            debug('Replication stream ended')
          })
          return stream
        }
      }, opts)

      const network = self.network = createNetwork(self.archive, netOpts, (err) => {
        if (err) return reject(err)
        resolve(network)
      })
      self.options.network = netOpts

      network.once('listening', () => {
        resolve(network)
      })
    })
  }

  async leave () {
    const self = this
    return new Promise((resolve, reject) => {
      if (!self.network) return resolve()
      debug('leaveNetwork()')
      if (self.archive && self.archive.content) self.archive.content.undownload()
      self.network.leave(self.archive.discoveryKey)
      self.network.destroy((err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  pause () {
    debug('pause()')
    this.leave()
  }

  resume () {
    debug('resume()')
    this.joinNetwork()
  }

  trackStats (opts) {
    opts = Object.assign({}, opts)
    this.stats = stats(this.archive, opts)
    return this.stats
  }

  importFiles (src, opts) {
    return new Promise((resolve, reject) => {
      if (!this.writable) reject(Error('Must be archive owner to import files.'))
      if (typeof src !== 'string') {
        opts = src
        src = this.path
      }

      src = src && src.length ? src : this.path
      opts = Object.assign({
        indexing: (opts && opts.indexing) || (src === this.path),
        keepExisting: (opts && opts.keepExisting) || (src !== this.path) // do not delete existing if importing other dir
      }, opts)

      this.importer = importFiles(this.archive, src, opts, (err) => {
        if (err) return reject(err)
        resolve()
      })
      this.options.importer = this.importer.options
    })
  }

  serveHttp (opts) {
    this.server = serveHttp(this.archive, opts)
    return this.server
  }

  async close () {
    if (this._closed) throw new Error('Dat is already closed')

    var self = this
    self._closed = true

    return new Promise(async (resolve, reject) => {
      try {
        debug('closing network')
        if (self.network) await closeNet()
        debug('closing closeFileWatch')
        if (self.importer) await closeFileWatch()
      } catch (e) {
        reject(e)
      }
      self.archive.close((err) => {
        if (err) return reject(err)
        resolve()
      })
    })

    async function closeNet () {
      return new Promise(async (resolve, reject) => {
        try {
          await self.leave()
          delete self.network
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    }

    async function closeFileWatch () {
      // Emitting an event, as imported doesn't emit an event on
      // destroy and there is no other means to see if this was called.
      self.importer.emit('destroy')
      self.importer.destroy()
      delete self.importer
      return new Promise((resolve, reject) => {
        process.nextTick((err) => {
          if (err) return reject(err)
          resolve()
        })
      })
    }
  }
}
Dat.prototype.joinNetwork = Dat.prototype.join
Dat.prototype.leaveNetwork = Dat.prototype.leave
