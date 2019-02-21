const { Parse, Team, Invite } = require('../parse-rest')
const getTeam = require('../auth/get-team')
const analytics = require('../analytics')

const acceptInvite = async ({ user, code }) => {
  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  const query = new Parse.Query(Invite)
  query.equalTo('code', code)
  query.equalTo('email', user.email)
  query.include('team')
  query.include('sender')
  const invites = await query.find({ useMasterKey: true })

  if (!invites.length) {
    return null
  }

  const invite = invites[0]
  let parseTeam = invite.get('team')
  const role = invite.get('role')

  const teamQuery = new Parse.Query(Team)
  teamQuery.equalTo('name', parseTeam.get('name'))
  teamQuery.include('admins')
  teamQuery.include('editors')
  teamQuery.include('viewers')

  const teams = await teamQuery.find({ useMasterKey: true })
  if (teams.length === 0) {
    return null
  }

  parseTeam = teams[0]

  parseTeam.get(`${role}s`).getUsers().add(parseUser)

  parseUser.addUnique('teams', parseTeam)

  parseTeam.get(`${role}s`).save(null, { useMasterKey: true })
  await parseTeam.save(null, { useMasterKey: true })
  await parseUser.save(null, { useMasterKey: true })

  invite.set('accepted', true)
  await invite.save(null, { useMasterKey: true })

  analytics.track('Added Member', {
    distinct_id: user.nickname,
    $user_id: user.nickname,
    Role: role,
    Team: parseTeam.get('name')
  })

  const refreshedTeam = await getTeam({ user, name: parseTeam.get('name') })
  return refreshedTeam
}

acceptInvite.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { code } = req.body
    res.send(await acceptInvite({ user, code }))
  } catch (err) {
    next(err)
  }
}

module.exports = acceptInvite
