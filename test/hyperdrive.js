var fs = require('fs')
var path = require('path')
var test = require('tape')
var tmpDir = require('temporary-directory')

var Dat = require('..')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

test('hyperdrive: write file', function (t) {
  tmpDir(function (_, dir, cleanup) {
    Dat(dir, function (err, dat) {
      t.error(err, 'no error')

      var archive = dat.archive
      archive.writeFile('hello.txt', 'hello world', function (err) {
        t.error(err, 'no error')
        archive.readFile('hello.txt', 'utf8', function (err, data) {
          t.error(err, 'no error')
          t.same(data, 'hello world', 'archive.readFile ok')
          fs.readFile(path.join(dir, 'hello.txt'), 'utf8', function (err, data) {
            t.same(data, 'hello world', 'fs.readFile ok')
            cleanup()
            t.end()
          })
        })
      })
    })
  })
})

test('hyperdrive: write dir', function (t) {
  tmpDir(function (_, dir, cleanup) {
    Dat(dir, function (err, dat) {
      t.error(err, 'no error')

      var archive = dat.archive
      archive.mkdir('/my-dir', function (err) {
        t.error(err, 'no error')
        archive.stat('/my-dir', function (err, stat) {
          t.error(err, 'no error')
          t.ok(stat, 'archive.stat on dir okay')
          t.ok(stat.isDirectory(), 'archive.stat isDirectory')

          // Currently not supported in dat-storage
          // TODO: https://github.com/datproject/dat-storage/issues/5
          // fs.stat(path.join(dir, 'my-dir'), function (err, stat) {
          //   t.error(err, 'no error')
          //   t.ok(stat, 'fs.stat on dir okay')
          //   t.ok(stat.isDirectory(), 'fs.stat isDirectory')
          // })

          cleanup()
          t.end()
        })
      })
    })
  })
})
