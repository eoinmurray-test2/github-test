const ms = require('ms')
const moment = require('moment')
const mongo = require('../mongo')
const logger = require('../logger')

const updateContainerActivity = async ({ proxyUrl, lastActivity }) => {
  const db = await mongo()

  if (!proxyUrl || !lastActivity) return

  const start = new Date()
  const container = await db.Containers.findOneAndUpdate({ proxyUrl }, {
    $set: {
      lastActivity: moment(lastActivity).toDate()
    }
  })
  const containerTime = ms(new Date() - start)
  logger.debug({ updateContainerActivity: { containerTime } })

  if (container) {
    return mongo.formatObject(container.value)
  }

  return null
}

updateContainerActivity.handler = async (req, res) => {
  const { proxyUrl, lastActivity } = req.body

  const container = await updateContainerActivity({ proxyUrl, lastActivity })
  if (container) {
    res.send(container)
  } else {
    res.status(400).send({ result: 'not found' })
  }
}

module.exports = updateContainerActivity
