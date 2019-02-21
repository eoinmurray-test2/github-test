const Octokit = require('@octokit/rest')
const { Parse, Study } = require('../parse-rest')
const createStudy = require('../studies/create-study')
const deleteStudy = require('../studies/delete-study')

const registerHook = async ({ user, repo }) => {
  if (!user.accessToken) {
    throw new Error('Github account not connected')
  }

  const octokit = new Octokit({
    auth: `token ${user.accessToken}`
  })

  let hook
  let study

  try {
    study = await createStudy({
      user,
      name: repo.name,
      author: user.nickname,
      requestPrivate: false,
      githubId: repo.id,
      githubOwner: repo.owner.login,
    })

    console.log('1')

    let hookUrl = `${process.env.API_URL}/github-hook`
    if (process.env.NODE_ENV === 'development') {
      hookUrl = 'https://smee.io/kyso-github-hook-test'
    }

    console.log({
      owner: repo.owner.login,
      repo: repo.name,
      name: 'web',
      config: {
        url: hookUrl,
        content_type: 'json',
      },
      events: ['push'],
      active: true
    })

    hook = await octokit.repos.createHook({
      owner: repo.owner.login,
      repo: repo.name,
      name: 'web',
      config: {
        url: hookUrl,
        content_type: 'json',
      },
      events: ['push'],
      active: true
    })

    console.log('2')

    const query = new Parse.Query(Study)
    query.equalTo('objectId', study.objectId)
    query.include('user')
    const parseStudies = await query.find({ sessionToken: user.sessionToken })
    const parseStudy = parseStudies[0]
    parseStudy.set('hookId', hook.data.id)
    await parseStudy.save(null, { sessionToken: user.sessionToken })

    console.log('3')

    return parseStudy.toJSON()
  } catch (err) {
    if (study) {
      await deleteStudy({ user, studyId: study.objectId })
    }

    if (hook) {
      await octokit.repos.deleteHook({
        owner: repo.owner.login,
        repo: repo.name,
        hook_id: hook.data.id
      })
    }

    throw err
  }
}

registerHook.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { repo } = req.body
    res.send(await registerHook({ user, repo }))
  } catch (err) {
    next(err)
  }
}


module.exports = registerHook
