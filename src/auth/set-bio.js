const { Parse } = require('../parse-rest')

const setBio = async ({ user, text }) => {
  const parseUser = new Parse.User()
  parseUser.id = user.objectId
  parseUser.set('bio', text)
  await parseUser.save(null, { sessionToken: user.sessionToken })
  return parseUser.toJSON()
}

setBio.handler = async (req, res, next) => {
  const { text } = req.body
  const user = req.user

  try {
    res.send(await setBio({ user, text }))
  } catch (err) {
    next(err)
  }
}

module.exports = setBio
