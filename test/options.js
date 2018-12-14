var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var encoding = require('dat-encoding')

var Dat = require('..')
var fixtures = path.join(__dirname, 'fixtures')

test('opts: string or buffer .key', function (t) {
  rimraf.sync(path.join(process.cwd(), '.dat')) // for failed tests
  var buf = Buffer.alloc(32)
  Dat(process.cwd(), { key: buf }, function (err, dat) {
    t.error(err, 'no callback error')
    t.deepEqual(dat.archive.key, buf, 'keys match')

    dat.close(function (err) {
      t.error(err, 'no close error')

      Dat(process.cwd(), { key: encoding.encode(buf) }, function (err, dat) {
        t.error(err, 'no callback error')
        t.deepEqual(dat.archive.key, buf, 'keys match still')
        dat.close(function () {
          rimraf.sync(path.join(process.cwd(), '.dat'))
          t.end()
        })
      })
    })
  })
})

test('opts: createIfMissing false', function (t) {
  rimraf.sync(path.join(fixtures, '.dat'))
  Dat(fixtures, { createIfMissing: false }, function (err, dat) {
    t.ok(err, 'throws error')
    t.end()
  })
})

test('opts: createIfMissing false with empty .dat', function (t) {
  t.skip('TODO')
  t.end()
  // rimraf.sync(path.join(fixtures, '.dat'))
  // fs.mkdirSync(path.join(fixtures, '.dat'))
  // Dat(fixtures, {createIfMissing: false}, function (err, dat) {
  //   t.ok(err, 'errors')
  //   rimraf.sync(path.join(fixtures, '.dat'))
  //   t.end()
  // })
})

test('opts: errorIfExists true', function (t) {
  rimraf.sync(path.join(fixtures, '.dat'))
  // create dat to resume from
  Dat(fixtures, function (err, dat) {
    t.ifErr(err)
    dat.close(function () {
      Dat(fixtures, { errorIfExists: true }, function (err, dat) {
        t.ok(err, 'throws error')
        t.end()
      })
    })
  })
})

test('opts: errorIfExists true without existing dat', function (t) {
  rimraf.sync(path.join(fixtures, '.dat'))
  // create dat to resume from
  Dat(fixtures, { errorIfExists: true }, function (err, dat) {
    t.ifErr(err)
    t.end()
  })
})
