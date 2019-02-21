const { Parse, Invite } = require('../parse-rest')

const getInvite = async ({ user, code }) => {
  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  const query = new Parse.Query(Invite)
  query.equalTo('code', code)
  query.equalTo('email', user.email)
  const invites = await query.find({ useMasterKey: true })

  if (!invites.length) {
    return null
  }

  const invite = invites[0].toJSON()
  return invite
}

getInvite.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { code } = req.body
    res.send(await getInvite({ user, code }))
  } catch (err) {
    next(err)
  }
}

module.exports = getInvite
