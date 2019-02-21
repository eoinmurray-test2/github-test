const Octokit = require('@octokit/rest')
const { Parse } = require('../parse-rest')

const removeGithubFromUser = async ({ user }) => {
  const accessToken = user.accessToken
  const parseUser = new Parse.User()
  parseUser.id = user.objectId
  parseUser.set('accessToken', null)
  parseUser.set('githubId', null)
  await parseUser.save(null, { sessionToken: user.sessionToken })

  const octokit = new Octokit({
    auth: {
      clientId: process.env.AUTH_GITHUB_CLIENT_ID,
      clientSecret: process.env.AUTH_GITHUB_CLIENT_SECRET
    }
  })

  try {
    const result = await octokit.oauthAuthorizations.revokeAuthorizationForApplication({
      client_id: process.env.AUTH_GITHUB_CLIENT_ID,
      access_token: accessToken
    })

    console.log(result)
  } catch (err) {
    console.error(err)
  }

  return parseUser.toJSON()
}

removeGithubFromUser.handler = async (req, res, next) => {
  const user = req.user

  try {
    res.send(await removeGithubFromUser({ user }))
  } catch (err) {
    next(err)
  }
}

module.exports = removeGithubFromUser
