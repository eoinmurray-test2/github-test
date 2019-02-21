const ms = require('ms')
const mongo = require('../mongo')
const logger = require('../logger')

module.exports = async () => {
  const db = await mongo()
  let start = new Date()
  const robotUser = await db.collection('_User').findOne({ username: 'robot@kyso.io' })
  const stop1 = new Date() - start
  if (!robotUser) return null

  // I should really be creating a session here
  start = new Date()
  const robotSession = await db.collection('_Session').findOne({ _p_user: `_User$${robotUser._id}` })
  const stop2 = new Date() - start
  if (!robotSession) return null

  robotUser._session_token = robotSession._session_token
  logger.debug(`Got robotUser in [${ms(stop1)}] and robotSession in [${ms(stop2)}]`)
  return mongo.formatObject(robotUser)
}
