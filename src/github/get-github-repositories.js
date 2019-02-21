const Octokit = require('@octokit/rest')

const getGithubRepositories = async ({ user }) => {
  if (user.accessToken) {
    const octokit = new Octokit({
      auth: `token ${user.accessToken}`
    })

    const repos = await octokit.repos.list()
    return repos.data
  }

  return []
}

getGithubRepositories.handler = async (req, res, next) => {
  try {
    const user = req.user
    res.send(await getGithubRepositories({ user }))
  } catch (err) {
    next(err)
  }
}


module.exports = getGithubRepositories
