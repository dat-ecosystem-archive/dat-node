const assert = require('assert')
const EventEmitter = require('events').EventEmitter
const each = require('stream-each')
const networkSpeed = require('hyperdrive-network-speed')
const bitfield = require('sparse-bitfield')

module.exports = (...args) => new DatStats(...args)

class DatStats extends EventEmitter {
  constructor (archive) {
    super()

    assert.ok(archive, 'lib/stats archive required')

    this.archive = archive
    this.network = networkSpeed(archive, { timeout: 2000 })
    this.counted = bitfield()
    this._count = {
      files: 0,
      byteLength: 0,
      length: 0,
      version: 0
    }

    this.update()
    if (!this.archive.writable) {
      this._count.downloaded = 0
      this._runDownloadStats()
    }
  }

  get peers () {
    if (!this.archive.content || !this.archive.content.peers) return {} // TODO: how to handle this?
    const peers = this.archive.content.peers
    const total = peers.length
    const complete = peers.filter(function (peer) {
      return peer.remoteLength === this.archive.content.length
    }).length

    return {
      total: total,
      complete: complete
    }
  }

  async get () {
    return new Promise((resolve, reject) => {
      this.once('update', (data) => {
        resolve(data)
      })
      this.update()
    })
  }

  update () {
    const self = this

    if (stableVersion()) {
      self.emit('update', self._count)
      return wait()
    }

    // get current size of archive
    const current = this.archive.tree.checkout(this.archive.version)
    const initial = this.archive.tree.checkout(this._count.version)
    const stream = initial.diff(current, { dels: true, puts: true })
    each(stream, ondata, () => {
      self._count.version = current.version
      self.emit('update', self._count)
      if (!stableVersion()) return self.update()
      wait()
    })

    function ondata (data, next) {
      if (data.type === 'del') {
        self._count.byteLength -= data.value.size
        self._count.length -= data.value.blocks
        self._count.files--
      } else {
        self._count.byteLength += data.value.size
        self._count.length += data.value.blocks
        self._count.files++
      }
      next()
    }

    function stableVersion () {
      if (self.archive.version < 0) return false
      return self._count.version === self.archive.version
    }

    function wait () {
      self.archive.metadata.update(() => {
        self.update()
      })
    }
  }

  _runDownloadStats () {
    if (!this.archive || !this.archive.content) return this.archive.once('content', this._runDownloadStats.bind(this))

    const feed = this.archive.content
    this._count.downloaded = 0
    for (let i = 0; i < feed.length; i++) {
      if (feed.has(i) && this.counted.set(i, true)) this._count.downloaded++
    }
    this.emit('update')

    this.archive.content.on('download', countDown.bind(this))
    this.archive.content.on('clear', checkDownloaded.bind(this))

    function checkDownloaded (start, end) {
      for (; start < end; start++) {
        if (this.counted.set(start, false)) this._count.downloaded--
      }
      this.emit('update')
    }

    function countDown (index, data) {
      if (this.counted.set(index, true)) this._count.downloaded++
      this.emit('update')
    }
  }
}
