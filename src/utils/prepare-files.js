/* global FileReader */
const crypto = require('crypto-js')
const versionHash = require('./version-hash')

module.exports = async (files) => {
  try {
    const fileMap = {}
    await Promise.all(files.map((file) =>
      new Promise((resolve) => {
        const sha1 = crypto.algo.SHA1.create()
        const fileContentsSha = sha1
          .update(crypto.lib.WordArray.create(file.data))
          .finalize()
          .toString()

        const sha2 = crypto.algo.SHA1.create()
        const fileMapHash = sha2
          .update(fileContentsSha)
          .update(file.path)
          .finalize()
          .toString()
        fileMap[fileMapHash] = file.path
        resolve()
      })
    ))

    return {
      fileMap,
      versionHash: versionHash(fileMap)
    }
  } catch (err) {
    return { fileMap: null, versionHash: null }
  }
}
