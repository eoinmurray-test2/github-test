const fs = require('fs-extra')
const archiver = require('archiver')
const fetch = require('isomorphic-fetch')
const { join, dirname } = require('path')
const { Version } = require('../parse-rest')
const uploadToParse = require('../utils/upload-to-parse')
const logger = require('../logger')

const download = async ({ url, path }) => {
  await fs.mkdirp(dirname(path))
  const res = await fetch(url)
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(path)
    res.body.pipe(fileStream)
    res.body.on('error', reject)
    fileStream.on('finish', resolve)
  })
}

const zip = async ({ source, target }) => new Promise(async (resolve, reject) => {
  await fs.mkdirp(dirname(target))

  const output = fs.createWriteStream(target)
  const archive = archiver('zip')

  output.on('close', resolve)

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn(err)
    } else {
      logger.error(err)
      reject(err)
    }
  })

  archive.on('error', reject)

  archive.pipe(output)
  archive.directory(source, false)
  archive.finalize()
})

const uploadZip = async (version) => {
  let parseVersion = new Version()
  parseVersion.id = version.objectId

  const zipped = await uploadToParse({
    path: join('/tmp', `${version.sha}.zip`),
    name: `${version.sha}.zip`,
    masterKey: process.env.PARSE_MASTER_KEY
  })

  parseVersion.set('zip', zipped)
  parseVersion = await parseVersion.save(null, { useMasterKey: true })
  return parseVersion.toJSON()
}

module.exports = async (version) => {
  const fileDownloads = version.filesArray.map(file => download({
    url: file.file.url,
    path: join('/tmp', version.sha, file.name)
  }))

  await Promise.all(fileDownloads)
  logger.debug(`downloaded files for ${version.sha}`)

  await zip({
    source: join('/tmp', version.sha),
    target: join('/tmp', `${version.sha}.zip`)
  })
  logger.debug('created zip')

  return uploadZip(version)
}
