const analytics = require('../analytics')
const { Parse } = require('../parse-rest')
const getTeam = require('../auth/get-team')
const doesUserHaveRole = require('./does-user-have-role')

const removeMember = async ({ user, team, targetNickname, targetRole }) => {
  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  const parseTeam = await getTeam({ user, name: team, parseObject: true })
  if (!parseTeam) {
    const err = new Error('Team does not exist, or you do not have access.')
    err.code = 403
    throw err
  }

  const isAdmin = await doesUserHaveRole({ user, teamname: parseTeam.get('name'), role: 'admin' })
  if (!isAdmin) {
    const err = new Error('You are not an admin, you cannot remove people.')
    err.code = 403
    throw err
  }

  const userQuery = new Parse.Query(Parse.User)
  userQuery.equalTo('nickname', targetNickname)
  const users = await userQuery.find()

  if (users.length === 0) {
    const err = new Error('Target user does not exist.')
    err.code = 403
    throw err
  }

  const targetUser = users[0]
  parseTeam.get(`${targetRole}s`).getUsers().remove(targetUser)

  await parseTeam.get(`${targetRole}s`).save(null, { sessionToken: user.sessionToken })
  await parseTeam.save(null, { sessionToken: user.sessionToken })

  analytics.track('Removed Member', {
    distinct_id: user.nickname,
    $user_id: user.nickname,
    Collaborator: targetNickname,
    Team: team
  })

  const refreshedTeam = await getTeam({ user, name: team })
  return refreshedTeam
}

removeMember.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { targetNickname, targetRole, team } = req.body
    const study = await removeMember({ user, targetNickname, targetRole, team })
    res.send(study)
  } catch (err) {
    next(err)
  }
}

module.exports = removeMember
