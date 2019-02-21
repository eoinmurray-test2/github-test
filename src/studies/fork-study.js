const logger = require('../logger')
const analytics = require('../analytics')
const getStudy = require('../studies/get-study')
const createStudy = require('../studies/create-study')
const { Parse, Study, Version, File } = require('../parse-rest')

const forkStudy = async ({ user, name, author, sha = null }) => {
  let _study
  try {
    const existingStudy = await getStudy({ user, author, name, sha })
    const versions = existingStudy.versionsArray
    versions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    const latestVersion = versions[0]

    const parseUser = new Parse.User()
    parseUser.id = user.objectId

    _study = await createStudy({ user, name, incrementName: true })
    const parseStudy = new Study()
    parseStudy.id = _study.objectId

    const existingParseStudy = new Study()
    existingParseStudy.id = existingStudy.objectId

    await parseStudy.fetch({ sessionToken: user.sessionToken })
    parseStudy.set('forkedFrom', existingParseStudy)
    parseStudy.set('user', parseUser)

    if (existingStudy.preview) {
      parseStudy.set('preview', Parse.File.fromJSON(existingStudy.preview))
    }

    parseStudy.set('description', existingStudy.description)
    const parseVersion = new Version()
    parseVersion.set('message', 'initial version')
    parseVersion.set('repository', latestVersion.repository || null)
    parseVersion.set('main', latestVersion.main)
    parseVersion.set('sha', latestVersion.sha)
    parseVersion.set('zip', latestVersion.zip)
    parseVersion.set('state', latestVersion.state)

    if (latestVersion.filesArray) {
      logger.debug(`Copying files`)
      const uploads = latestVersion.filesArray.map((file) =>
        new Promise(async (resolve, reject) => {
          try {
            logger.debug(`forking ${file.name}`)
            const parseFile = new File()
            parseFile.set('file', Parse.File.fromJSON(file.file))
            parseFile.set('name', file.name)
            parseFile.set('size', file.size)
            parseFile.set('user', parseUser)
            parseFile.set('study', parseStudy)
            parseFile.set('sha', file.sha)
            parseFile.setACL(parseStudy.getACL())
            await parseFile.save(null, { sessionToken: user.sessionToken })
            resolve(parseFile)
          } catch (err) {
            console.log('caught it')
            logger.error(err)
            reject(err)
          }
        }))

      logger.debug('uploads')
      const files = await Promise.all(uploads)
      logger.debug('files')
      logger.debug(files)
      files.map(file => parseVersion.addUnique('filesArray', file))
      logger.debug('\n\n')
    }

    parseVersion.set('fileMap', latestVersion.fileMap)
    parseVersion.set('study', parseStudy)
    parseVersion.set('user', parseUser)
    parseVersion.setACL(parseStudy.getACL())

    await parseVersion.save(null, { sessionToken: user.sessionToken })
    parseStudy.addUnique('versionsArray', parseVersion)

    existingParseStudy.addUnique('forks', parseStudy)
    await existingParseStudy.save(null, { useMasterKey: true })
    await parseStudy.save(null, { sessionToken: user.sessionToken })

    analytics.track('Forked Study', {
      distinct_id: user.nickname,
      $user_id: user.nickname,
      'Study Author': parseStudy.toJSON().user.nickname,
      'Study Name': parseStudy.toJSON().name,
      'Study Id': parseStudy.toJSON().objectId,
      'Study Fullname': `${parseStudy.toJSON().user.nickname}/${parseStudy.toJSON().name}`,

      'Old Study Author': existingStudy.user.nickname,
      'Old Study Name': existingStudy.name,
      'Old Study Id': existingStudy.objectId,
      'Old Study Fullname': `${existingStudy.user.nickname}/${existingStudy.name}`,
    })

    return {
      ...parseStudy.toJSON(),
      user
    }
  } catch (err) {
    if (_study) {
      const parseStudy = new Study()
      parseStudy.id = _study.objectId
      parseStudy.set('state', 'DELETED')
      await parseStudy.save(null, { sessionToken: user.sessionToken })
    }
    throw err
  }
}

forkStudy.handler = async (req, res, next) => {
  try {
    const { name, author, sha } = req.body
    const study = await forkStudy({ user: req.user, name, author, sha })
    if (study) {
      res.send(study)
    } else {
      res.status(404).send({ result: 'not found' })
    }
  } catch (err) {
    next(err)
  }
}

module.exports = forkStudy
