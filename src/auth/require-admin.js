const getUser = require('./get-user')
const mongo = require('../mongo')

module.exports = async (req, res, next) => {
  try {
    const db = await mongo()
    const sessionToken = getUser.parseTokenFromReq(req)
    if (!sessionToken) {
      return res.status(400).send({ error: 'not j authorized' })
    }
    const user = await getUser({ sessionToken })
    if (!user) {
      throw new Error('not authorized')
    }

    const role = await db.Roles.findOne({ [`_acl.${user.objectId}.w`]: true })
    if (!role) {
      return res.status(400).send({ error: 'not authorized' })
    }

    req.user = user
    return next()
  } catch (err) {
    return next(err)
  }
}
