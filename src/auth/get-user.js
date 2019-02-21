const ms = require('ms')
const mongo = require('../mongo')
const logger = require('../logger')

const getUser = async ({ sessionToken = null, nickname = null }) => {
  const db = await mongo()
  let start = new Date()

  let query = null

  if (sessionToken) {
    const session = await db.Sessions.findOne({ _session_token: sessionToken })
    const sessionTime = ms(new Date() - start)
    if (!session) {
      throw new Error('not authorized')
    }
    logger.debug({ sessionTime })
    query = { _id: session._p_user.replace('_User$', '') }
  }

  if (nickname) {
    query = { nickname }
  }

  start = new Date()
  const _user = await db.Users
    .aggregate([
      { $match: query },
      { $project: { _hashed_password: 0 } }
    ])
    .limit(1)
    .next()

  if (!_user) {
    return null
  }

  const userTime = ms(new Date() - start)
  _user._session_token = sessionToken
  logger.debug({ userTime })
  const user = mongo.formatObject(_user)

  const roles = await mongo.getRolesForUser(user)

  const teamQuery = {
    _rperm: { $in: [user.objectId].concat(roles.map(role => `role:${role.name}`)) }
  }

  const _teams = await db.Teams.find(teamQuery).toArray()
  if (_teams.length > 0) {
    const teams = _teams.map(team => mongo.formatObject(team))
    user.teams = teams
  }

  return user
}

getUser.parseTokenFromReq = (req) => {
  if (req.header('x-parse-session-token')) {
    return req.header('x-parse-session-token')
  }

  if (req.header('authorization')) {
    const auth = req.header('authorization')
    if (auth.startsWith('Bearer')) {
      return auth.replace('Bearer ', '').trim()
    }
    if (auth.startsWith('bearer')) {
      return auth.replace('bearer ', '').trim()
    }
  }

  return null
}

module.exports = getUser
