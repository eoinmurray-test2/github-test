const crypto = require('crypto-js')
const { Buffer } = require('buffer')

module.exports = (fileMap) => {
  // must add header which contains file names and message

  const hashes = Object.keys(fileMap)

  const filenames = Object.keys(fileMap)
    .map(key => fileMap[key])
    .sort()

  const header = `${filenames.join(',')}`

  const dataBufferList = hashes
    .sort() // <- NB since we need to versionHash to be the same every time
    .map(h => Buffer.from(h))

  const headerBuffer = Buffer.from(header)
  const buf = Buffer.concat(dataBufferList.concat(headerBuffer))

  const finalSha = crypto
    .SHA1(crypto.lib.WordArray.create(buf))
    .toString()

  return finalSha
}
