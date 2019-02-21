const Octokit = require('@octokit/rest')
const { Parse, Study } = require('../parse-rest')

const githubHook = async ({ user, repo, studyId }) => {
  if (!user.accessToken) {
    throw new Error('Github account not connected')
  }

  const query = new Parse.Query(Study)
  const parseStudy = await query.get(studyId, { sessionToken: user.sessionToken })
  const study = parseStudy.toJSON()

  const octokit = new Octokit({
    auth: `token ${user.accessToken}`
  })

  try {
    await octokit.repos.deleteHook({
      owner: repo.owner.login,
      repo: repo.name,
      hook_id: Number(study.hookId)
    })
  } catch (err) {

  }

  parseStudy.set('state', 'DELETED')
  parseStudy.set('githubId', null)
  parseStudy.set('githubName', null)
  parseStudy.set('hookId', null)

  await parseStudy.save(null, { sessionToken: user.sessionToken })

  return parseStudy.toJSON()
}

githubHook.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { repo, studyId } = req.body
    res.send(await githubHook({ user, repo, studyId }))
  } catch (err) {
    next(err)
  }
}


module.exports = githubHook
