
const fetch = require('isomorphic-fetch')
const mkdirp = require('mkdirp')
const unzip = require('unzip')
const path = require('path')
const pify = require('pify')
const tar = require('tar')
const fs = require('fs')
const { Version, Study, Parse, ParseAppId } = require('../parse-rest')

const analytics = require('../analytics')
const createStudy = require('./create-study')
const { uploadFiles } = require('../utils/upload')
const screenshotStudy = require('./screenshot-study')
const uploadToParse = require('../utils/upload-to-parse')
const getTeam = require('../auth/get-team')
const logger = require('../logger')

const createVersion = ({
  user,
  sha,
  name,
  title,
  description,
  tags,
  repository,
  main,
  tarPath,
  fileMap,
  dir,
  message = null,
  error = null,
  team = null,
  source = 'unknown',
  githubImport = false,
  commitSha = null
}) =>
  new Promise(async (resolve, reject) => {
    const version = new Version()
    let parseStudy
    let parseTeam
    try {
      if (team) {
        parseTeam = await getTeam({ user, name: team, parseObject: true })
        if (!team) {
          const err = new Error('Team does not exist, or you do not have access.')
          err.code = 403
          throw err
        }
      }

      const parseUser = new Parse.User()
      parseUser.id = user.objectId

      const studyQuery = new Parse.Query(Study)
      studyQuery.notEqualTo('state', 'DELETED')
      studyQuery.equalTo('name', `${name}`)
      if (team) {
        studyQuery.equalTo('team', parseTeam)
      } else {
        studyQuery.equalTo('user', parseUser)
      }

      studyQuery.include('user')
      let results
      if (githubImport) {
        results = await studyQuery.find({ useMasterKey: true })
      } else {
        results = await studyQuery.find({ sessionToken: user.sessionToken })
      }

      parseStudy = new Study()
      if (results.length > 0) {
        parseStudy = results[0]
        analytics.track('Published Update', {
          distinct_id: user.nickname,
          $user_id: user.nickname,
          'Study Author': user.nickname,
          'Study Name': parseStudy.toJSON().name,
          'Study Id': parseStudy.toJSON().objectId,
          'Study Fullname': `${user.nickname}/${parseStudy.toJSON().name}`,
          Source: source
        })
      } else {
        const study = await createStudy({ user, name, team, title, description, tags })
        parseStudy.id = study.objectId

        if (githubImport) {
          await parseStudy.fetch({ useMasterKey: true })
        } else {
          await parseStudy.fetch({ sessionToken: user.sessionToken })
        }

        analytics.track('Published Study', {
          distinct_id: user.nickname,
          $user_id: user.nickname,
          'Study Author': user.nickname,
          'Study Name': parseStudy.toJSON().name,
          'Study Id': parseStudy.toJSON().objectId,
          'Study Fullname': `${user.nickname}/${parseStudy.toJSON().name}`,
          Source: source === 'upload' ? 'Upload' : 'Extension'
        })
      }

      if (parseTeam) {
        console.log('adding team permissions')
        const acl = parseStudy.getACL()
        acl.setRoleWriteAccess(parseTeam.get('admins'), true)
        acl.setRoleWriteAccess(parseTeam.get('editors'), true)

        acl.setRoleReadAccess(parseTeam.get('admins'), true)
        acl.setRoleReadAccess(parseTeam.get('editors'), true)
        acl.setRoleReadAccess(parseTeam.get('viewers'), true)

        parseStudy.setACL(acl)
        parseStudy.set('team', parseTeam)
        if (githubImport) {
          await parseStudy.save(null, { useMasterKey: true })
        } else {
          await parseStudy.save(null, { sessionToken: user.sessionToken })
        }
      }

      const query = new Parse.Query(Version)
      query.descending("createdAt")
      query.equalTo('study', parseStudy)

      let existingVersion
      if (githubImport) {
        existingVersion = await query.first({ useMasterKey: true })
      } else {
        existingVersion = await query.first({ sessionToken: user.sessionToken })
      }

      if (!githubImport && existingVersion && existingVersion.get('sha') === sha) {
        const err = new Error(`Nothing has changed. Refusing to make version.`)
        err.code = 403
        throw err
      }

      version.set('message', message)
      version.set('repository', repository || null)
      version.set('main', main)
      version.set('sha', sha)
      version.set('fileMap', fileMap)
      version.set('study', parseStudy)
      version.set('user', parseUser)
      if (commitSha) version.set('commitSha', commitSha)
      version.setACL(parseStudy.getACL())
      version.set('state', 'SAVING')
      if (error) {
        if (typeof error === "object") {
          version.set('state', error.type)
          version.set('message', error.message)
        } else {
          version.set('state', 'ERROR')
          version.set('message', error)
        }
      }

      if (githubImport) {
        await version.save(null, { useMasterKey: true })
      } else {
        await version.save(null, { sessionToken: user.sessionToken })
      }
      parseStudy.addUnique('versionsArray', version)

      if (githubImport) {
        await parseStudy.save(null, { useMasterKey: true })
      } else {
        await parseStudy.save(null, { sessionToken: user.sessionToken })
      }

      const _version = version.toJSON()
      _version.study = parseStudy.toJSON()
      _version.study.user = user
      if (parseTeam) {
        _version.study.team = parseTeam.toJSON()
      }
      resolve(_version)

      if (error) return

      logger.info(`Uploading zip`)
      let zipUpload
      if (githubImport) {
        zipUpload = await uploadToParse({ user, path: tarPath, name: `${sha}.zip`, masterKey: process.env.PARSE_MASTER_KEY })
      } else {
        zipUpload = await uploadToParse({ user, path: tarPath, name: `${sha}.zip` })
      }

      version.set('zip', Parse.File.fromJSON(zipUpload))
      if (githubImport) {
        await version.save(null, { useMasterKey: true })
      } else {
        await version.save(null, { sessionToken: user.sessionToken })
      }

      logger.info(`Uploading files`)
      let files
      if (githubImport) {
        files = await uploadFiles({ user, study: parseStudy, fileMap, dir, useMasterKey: true })
      } else {
        files = await uploadFiles({ user, study: parseStudy, fileMap, dir })
      }

      logger.info(`Uploaded files, adding to version`)
      files.map(file => version.addUnique('filesArray', file))
      logger.info(`Added to version`)
      version.set('state', 'READY')
      if (githubImport) {
        await version.save(null, { useMasterKey: true })
      } else {
        await version.save(null, { sessionToken: user.sessionToken })
      }
      if (parseStudy) {
        try {
          logger.info('screenshotting')
          const result = await screenshotStudy({ studyId: parseStudy.id })
          logger.info(result)
        } catch (err) {
          logger.error(`Screenshotter offline`)
        }
      }
      logger.info(`Saved`)
    } catch (err) {
      logger.info(err)
      version.set('state', 'ERROR')
      version.set('message', err.message)
      if (githubImport) {
        await version.save(null, { useMasterKey: true })
      } else {
        await version.save(null, { sessionToken: user.sessionToken })
      }
      reject(err)
    }
  })

createVersion.handler = async (req, res, next) => {
  try {
    if (!req.headers.hasOwnProperty('x-parse-session-token')) { // eslint-disable-line
      return res.status(403).send({ error: 'unauthorized' })
    }
    if (!req.headers.hasOwnProperty('body')) { // eslint-disable-line
      return res.status(403).send({ error: 'need to include body header' })
    }

    const body = JSON.parse(req.headers.body)
    const { zipped, source, team, sha, name, title, description, tags, message, pkg, repository, main, fileMap } = body
    const sessionToken = req.headers['x-parse-session-token']

    const headers = {
      'X-Parse-Application-Id': ParseAppId,
      'X-Parse-Session-Token': sessionToken
    }

    const r = await fetch(`${Parse.serverURL}/users/me`, { headers })
    const user = await r.json()
    if (user.hasOwnProperty('error')) { // eslint-disable-line
      return res.status(403).send(user)
    }

    const extractPath = path.join('/tmp', sha)
    await pify(mkdirp)(extractPath)
    const tarPath = `${extractPath}.${zipped ? 'zip' : 'tar'}`

    await new Promise(async (resolve, reject) => { // eslint-disable-line
      const writer = fs.createWriteStream(tarPath)
      req.pipe(writer)
      writer.on('close', () => {
        const reader = fs.createReadStream(tarPath)
        if (zipped) {
          const stream = unzip.Extract({ path: extractPath })
          reader.pipe(stream)
          stream.on('close', () => {
            resolve()
          })
          stream.on('error', (error) => reject(error))
        } else {
          const stream = tar.extract({ strict: true, cwd: extractPath })
          reader.pipe(stream)
          stream.on('end', () => resolve())
        }
      })
    })

    const version = await createVersion({
      name,
      title,
      description,
      tags,
      user,
      sha,
      message,
      team,
      source,
      pkg,
      repository,
      main,
      fileMap,
      tarPath,
      dir: extractPath
    })
    return res.send(version)
  } catch (err) {
    return next(err)
  }
}

module.exports = createVersion
