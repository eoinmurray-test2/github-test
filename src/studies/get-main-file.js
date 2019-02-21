const ms = require('ms')
const fetch = require('isomorphic-fetch')
const { Parse, Version } = require('../parse-rest')
const logger = require('../logger')

const getMainFile = async ({ user, versionId }) => {
  const query = new Parse.Query(Version)
  query.include('filesArray')

  const _version = await query.get(versionId, { sessionToken: user && user.sessionToken })
  const version = _version.fullJSON()
  const main = version.filesArray.find((file) => file.name === version.main)

  const start = new Date()
  const request = await fetch(main.file.url)
  logger.debug(`\tSending ${main.file.url}\n\tTook ${ms(new Date() - start)} to download`)
  return request.text()
}

getMainFile.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { versionId } = req.body
    return res.send(await getMainFile({ user, versionId }))
  } catch (err) {
    return next(err)
  }
}


module.exports = getMainFile
