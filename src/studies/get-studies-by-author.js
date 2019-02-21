const { Parse, Study } = require('../parse-rest')

const getStudiesByAuthor = async ({ author }) => {
  const userQuery = new Parse.Query(Parse.User)
  userQuery.equalTo('nickname', author)
  const parseUsers = await userQuery.find()

  if (parseUsers.length === 0) {
    return { studies: null, user: null }
  }

  const parseUser = parseUsers[0]
  const query = new Parse.Query(Study)
  query.equalTo('user', parseUser)
  query.notEqualTo('state', 'DELETED')
  query.include('user')
  query.include('team')
  query.include('versionsArray')
  query.include('versionsArray.filesArray')
  query.descending('createdAt')
  const studies = await query.find()
  return {
    studies: studies.map(s => s.toJSON()),
    user: parseUser.toJSON()
  }
}

getStudiesByAuthor.handler = async (req, res, next) => {
  try {
    const { author } = req.body
    res.send(await getStudiesByAuthor({ author }))
  } catch (err) {
    next(err)
  }
}

module.exports = getStudiesByAuthor
