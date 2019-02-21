const { Parse, Study, Version } = require('../parse-rest')

const checkVersionExists = async ({ user, name, versionSha }) => {
  const studyQuery = new Parse.Query(Study)
  studyQuery.notEqualTo('state', 'DELETED')
  studyQuery.equalTo('name', name)

  const results = await studyQuery.find({ sessionToken: user.sessionToken })

  let parseStudy = new Study()
  if (results.length > 0) {
    parseStudy = results[0]
  } else {
    return { exists: false }
  }

  const query = new Parse.Query(Version)
  query.descending("createdAt")
  query.equalTo('study', parseStudy)
  const existingVersion = await query.first({ sessionToken: user.sessionToken })
  if (existingVersion && existingVersion.get('sha') === versionSha) {
    return { exists: true }
  }
  return { exists: false }
}

checkVersionExists.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { name, versionSha } = req.body
    const result = await checkVersionExists({ user, name, versionSha })
    res.send(result)
  } catch (err) {
    next(err)
  }
}


module.exports = checkVersionExists
