const { Parse, Study } = require('../parse-rest')
const getTeam = require('../auth/get-team')

const getStudy = async ({ user, author, name, limit = null, sha = null }) => {
  const sessionToken = user ? user.sessionToken : null

  const parseTeam = await getTeam({ user, name: author, parseObject: true })

  const query = new Parse.Query(Study)
  if (parseTeam) {
    query.equalTo('team', parseTeam)
  } else {
    const innerQuery = new Parse.Query(Parse.User)
    innerQuery.equalTo('nickname', author)
    query.matchesQuery('user', innerQuery)
    query.equalTo('team', null)
  }

  query.equalTo('name', name)
  query.notEqualTo('state', 'DELETED')

  query.include('user')
  query.include('collaborators')
  query.include('versionsArray')
  query.include('versionsArray.filesArray')
  query.include('stargazers')
  query.include('team')
  query.include('forkedFrom')
  query.include('forkedFrom.user')
  query.descending('createdAt')

  const studies = await query.find({ sessionToken })
  if (!studies.length) {
    return null
  }

  const study = studies[0].toJSON()
  if (study.versionsArray && study.versionsArray.length) {
    study.versionsArray = study.versionsArray.map((version) => {
      version.filesArray = version.filesArray || [] // eslint-disable-line
      return version
    })

    study.versionsArray = study.versionsArray
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    if (sha) {
      study.versionsArray = [study.versionsArray.find(version => version.sha.startsWith(sha))]
    }

    if (limit) {
      study.versionsArray = study.versionsArray.slice(0, limit)
    }
  }
  return study
}

getStudy.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { author, name, limit = null, sha = null } = req.body
    res.send(await getStudy({ user, author, name, limit, sha }))
  } catch (err) {
    next(err)
  }
}

module.exports = getStudy
