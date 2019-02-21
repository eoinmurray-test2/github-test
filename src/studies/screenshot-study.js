const ms = require('ms')
const fetch = require('isomorphic-fetch')
const { Parse, Study } = require('../parse-rest')
const getStudy = require('./get-study')
const logger = require('../logger')

const screenshotStudy = ({ studyId = null, study = null, user = null }) =>
  new Promise(async (resolve, reject) => {
    try {
      let parseStudy = new Study()
      if (studyId) {
        const query = new Parse.Query(Study)
        query.include('user')
        query.include('versionsArray')
        query.include('versionsArray.filesArray')
        parseStudy = await query.get(studyId, { useMasterKey: true })
        study = parseStudy.toJSON()
      } else {
        parseStudy.id = study.objectId
      }

      if (!study.user) return resolve('no user')
      // if (study.preview) return resolve('has preview')
      logger.debug(`starting screenshot ${study.user.nickname}/${study.name}`)
      const version = (study && study.versionsArray) ? study.versionsArray[0] : null
      if (!version.filesArray) {
        logger.debug('no files')
        return resolve('no files')
      }

      const _file = version.filesArray.find((f) => f.name === version.main)
      if (!_file) {
        return resolve('no main file')
      }
      const src = `/render/NO_BUILD_ID/${_file.file.url.replace('https://', '').replace('http://', '')}`
      const url = `${process.env.UI_URL}${src}`

      logger.debug({
        url,
        sha: version.sha,
        cookieString: JSON.stringify(user)
      })

      const start = new Date()
      const response = await fetch(process.env.SCREENSHOTTER_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          url,
          sha: version.sha,
          cookieString: JSON.stringify(user)
        })
      })

      if (!response.ok) {
        logger.debug('Request to screenshotter failed')
        const text = await response.text()
        logger.debug(text)
        throw new Error(text)
      }

      const { file, description } = await response.json()
      logger.debug(`\t- Screenshot finished`)

      if (!file && !description) {
        logger.debug(`\t- Screenshot failed`)
        return resolve(null)
      }

      parseStudy.set('description', description)
      if (!file) {
        await parseStudy.save(null, { useMasterKey: true })
        logger.debug(`\t- finished ${ms(new Date() - start)}`)
        return reject(new Error(`No element`))
      }

      parseStudy.set('preview', Parse.File.fromJSON(file))
      await parseStudy.save(null, { useMasterKey: true })
      logger.debug(`\t- finished ${ms(new Date() - start)}`)
      return resolve(parseStudy.toJSON())
    } catch (err) {
      logger.debug(err.message)
      return reject(err)
    }
  })

screenshotStudy.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { author, name } = req.body
    const study = await getStudy({ author, name, user })
    const result = await screenshotStudy({ study, user })
    return res.send(result)
  } catch (err) {
    return next(err)
  }
}

module.exports = screenshotStudy
