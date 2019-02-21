const { Parse } = require('../parse-rest')

const getMentionUser = async () => {
  const query = new Parse.Query(Parse.User)
  query.limit(10)
  const  mentionUsersObject = await query.find()
  return mentionUsersObject.map(m => m.toJSON())
}

getMentionUser.handler = async (req, res, next) => {
  const { mentionUsers } = req.body
  const user = req.user
  try {
    res.send(await getMentionUser({ user, mentionUsers }))
  } catch (err) {
    next(err)
  }
}

module.exports = getMentionUser
