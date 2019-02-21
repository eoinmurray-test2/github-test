const getUser = require('./get-user')

module.exports = async (req, res, next) => {
  try {
    const sessionToken = getUser.parseTokenFromReq(req)
    if (!sessionToken) {
      throw new Error('not authorized')
    }

    const user = await getUser({ sessionToken })

    if (!user) {
      throw new Error('not authorized')
    }

    req.user = user
    return next()
  } catch (err) {
    return next(err)
  }
}
