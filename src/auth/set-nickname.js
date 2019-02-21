const { Parse } = require('../parse-rest')

const setNickname = async ({ user, nickname }) => {
  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  parseUser.set('nickname', nickname)
  await parseUser.save(null, { sessionToken: user.sessionToken })
  return parseUser.toJSON()
}

setNickname.handler = async (req, res, next) => {
  const { nickname } = req.body
  const user = req.user

  try {
    res.send(await setNickname({ user, nickname }))
  } catch (err) {
    next(err)
  }
}

module.exports = setNickname
