const getStudy = require('./get-study')
const createVersionZip = require('../containers/create-version-zip')
const logger = require('../logger')

const getDownloadUrl = async ({ user, name, author, sha = null }) => {
  console.log({ user, author, name, sha })
  const study = await getStudy({ user, author, name, sha })
  let version = (study && study.versionsArray) ? study.versionsArray[0] : []

  console.log(study, version)

  try {
    // if (!version.zip) {
    version = await createVersionZip(version)
    // }

    if (!version.zip) {
      throw new Error('study does not have zip to add to container')
    }

    logger.debug({ url: version.zip.url })

    return { url: version.zip.url }
  } catch (err) {
    logger.error(err)
    throw err
  }
}

getDownloadUrl.handler = async (req, res) => {
  const { name, author, sha } = req.body

  const result = await getDownloadUrl({ user: req.user, name, author, sha })
  if (result) {
    res.send(result)
  } else {
    res.status(404).send({ result: 'not found' })
  }
}

module.exports = getDownloadUrl
