const ms = require('ms')
const { Parse, Study } = require('../parse-rest')
const logger = require('../logger')

const getStudies = async ({ user }) => {
  const start = new Date()
  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  const query = new Parse.Query(Study)
  query.equalTo('collaborators', parseUser)
  query.include('user')
  query.include('versionsArray')
  query.include('team')
  query.include('versionsArray.filesArray')
  query.notEqualTo('state', 'DELETED')
  query.descending('createdAt')
  const studies = await query.find({ sessionToken: user.sessionToken })
  logger.debug(`Got studies [${ms(new Date() - start)}]`)
  const _studies = studies.map(s => s.toJSON())
  return _studies
}

getStudies.handler = async (req, res, next) => {
  try {
    res.send(await getStudies({ user: req.user }))
  } catch (err) {
    next(err)
  }
}

module.exports = getStudies
