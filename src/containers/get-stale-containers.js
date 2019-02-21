const ms = require('ms')
const moment = require('moment')
const mongo = require('../mongo')
const logger = require('../logger')

module.exports = async ({ staleTime = 5 /* minutes */ } = {}) => {
  const db = await mongo()

  const fiveMinsAgo = moment().subtract(staleTime, 'minute').toDate()
  const threeHoursAgo = moment().subtract(3, 'hour').toDate()
  const start = new Date()

  const containers = await db.Containers.aggregate([
    {
      $addFields: {
        startTimes: {
          $slice: ["$startTimes", -1]
        }
      }
    },
    ...mongo.includeField({ field: 'user', from: '_User' }),
    {
      $match: {
        'user.plan': { $ne: 'data-scientist-v1' },
        state: 'RUNNING',
        keepAlive: { $ne: true },
        $or: [
          {
            lastActivity: { $lt: fiveMinsAgo }
          },
          {
            startTimes: { $lt: threeHoursAgo }
          }
        ]
      }
    },
  ]).toArray()

  const containerTime = ms(new Date() - start)

  logger.debug({ getContainers: { containerTime } })

  if (containers.length === 0) {
    return []
  }

  const _containers = containers.map(container => mongo.formatObject(container))
  _containers.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
  return _containers
}
