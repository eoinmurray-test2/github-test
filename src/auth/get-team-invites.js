const { Parse, Invite } = require('../parse-rest')
const getTeam = require('../auth/get-team')

const getTeamInvites = async ({ user, name }) => {
  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  const parseTeam = await getTeam({ user, name, parseObject: true })
  if (!parseTeam) {
    const err = new Error('Team does not exist, or you do not have access.')
    err.code = 403
    throw err
  }

  const query = new Parse.Query(Invite)
  query.equalTo('team', parseTeam)
  query.equalTo('accepted', false)
  const invites = await query.find({ sessionToken: user.sessionToken })
  return invites.map(i => i.toJSON())
}

getTeamInvites.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { team } = req.body
    res.send(await getTeamInvites({ user, name: team }))
  } catch (err) {
    next(err)
  }
}

module.exports = getTeamInvites
