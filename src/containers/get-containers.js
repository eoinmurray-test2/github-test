const ms = require('ms')
const mongo = require('../mongo')
const logger = require('../logger')
const getTeam = require('../auth/get-team')

const getContainers = async ({ user, team }) => {
  const db = await mongo()
  const start = new Date()

  const roles = await mongo.getRolesForUser(user)

  const query = {
    _rperm: { $in: [user.objectId].concat(roles.map(role => `role:${role.name}`)) },
    state: { $ne: 'TERMINATED' }
  }

  if (team) {
    const parseTeam = await getTeam({ user, name: team, parseObject: true })
    query._p_team = `Team$${parseTeam.id}`
  } else {
    query._p_user = `_User$${user.objectId}`
    query._p_team = { $exists: 0 }
  }

  const containers = await db.Containers.find(query).toArray()
  const containerTime = ms(new Date() - start)

  logger.debug({ getContainers: { containerTime } })

  if (containers.length === 0) {
    return []
  }

  const _containers = containers.map(container => mongo.formatObject(container))
  _containers.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
  return _containers
}

getContainers.handler = async (req, res, next) => {
  try {
    const { team } = req.body
    res.send(await getContainers({ user: req.user, team }))
  } catch (err) {
    next(err)
  }
}

module.exports = getContainers
