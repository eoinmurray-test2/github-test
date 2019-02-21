const { Parse } = require('../parse-rest')

const addGithubToUser = async ({ user, accessToken, githubId }) => {
  const parseUser = new Parse.User()
  parseUser.id = user.objectId
  parseUser.set('accessToken', accessToken)
  parseUser.set('githubId', githubId)

  await parseUser.save(null, { sessionToken: user.sessionToken })
  return parseUser.toJSON()
}

addGithubToUser.handler = async (req, res, next) => {
  const { accessToken, githubId } = req.body
  const user = req.user

  try {
    res.send(await addGithubToUser({ user, accessToken, githubId }))
  } catch (err) {
    next(err)
  }
}

module.exports = addGithubToUser
