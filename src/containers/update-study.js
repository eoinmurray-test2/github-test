const analytics = require('../analytics')
const getStudy = require('../studies/get-study')
const createContainer = require('./create-container')
const createVersionZip = require('./create-version-zip')
const awaitContainerState = require('./ecs/await-container-state')
const logger = require('../logger')

const updateStudy = async ({ user, name, author, sha = null, update = false }) => new Promise(async (resolve, reject) => {
  try {
    const study = await getStudy({ user, author, name, sha })
    let version = (study && study.versionsArray) ? study.versionsArray[0] : []
    logger.debug(version.zip)
    version = await createVersionZip(version)
    logger.debug(version)
    if (!version.zip) {
      throw new Error('study does not have zip to add to container')
    }

    const container = await createContainer({
      user,
      name: study.name,
      clone: {
        url: version.zip.url,
        author,
        name,
        update
      }
    })
    resolve(container)

    analytics.track('Opened study in Container', {
      distinct_id: user.nickname,
      $user_id: user.nickname,
      'Study Author': study.user.nickname,
      'Study Name': study.name,
      'Study Id': study.objectId,
      'Study Fullname': `${study.user.nickname}/${study.name}`
    })

    await awaitContainerState({ user, containerId: container.objectId })
    logger.debug('container state ready, downloading')
  } catch (err) {
    logger.error(err)
    reject(err)
  }
})

updateStudy.handler = async (req, res) => {
  const { name, author, sha, update } = req.body

  const container = await updateStudy({ user: req.user, name, author, sha, update })
  if (container) {
    res.send(container)
  } else {
    res.status(404).send({ result: 'not found' })
  }
}

module.exports = updateStudy
