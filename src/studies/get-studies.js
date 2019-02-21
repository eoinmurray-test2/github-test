const ms = require('ms')
const { Parse, Study } = require('../parse-rest')
const getTeam = require('../auth/get-team')
const logger = require('../logger')

const getStudies = async ({ user, team }) => {
  const start = new Date()
  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  const query = new Parse.Query(Study)

  if (team) {
    const parseTeam = await getTeam({ user, name: team, parseObject: true })
    query.equalTo('team', parseTeam)
  } else {
    query.equalTo('user', parseUser)
    query.equalTo('team', null)
  }

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
    const { team } = req.body
    res.send(await getStudies({ user: req.user, team }))
  } catch (err) {
    next(err)
  }
}

module.exports = getStudies
