const { Parse, Invite } = require('../parse-rest')

const deleteInvite = async ({ user, code }) => {
  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  const query = new Parse.Query(Invite)
  query.equalTo('code', code)
  const invites = await query.find({ sessionToken: user.sessionToken })

  if (!invites.length) {
    return null
  }

  await invites[0].destroy({ sessionToken: user.sessionToken })
  return true
}

deleteInvite.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { code } = req.body
    res.send(await deleteInvite({ user, code }))
  } catch (err) {
    next(err)
  }
}

module.exports = deleteInvite
