const analytics = require('../analytics')
const { Parse } = require('../parse-rest')
const getTeam = require('../auth/get-team')
const sendTeamInvite = require('../auth/send-team-invite')
const doesUserHaveRole = require('./does-user-have-role')
const send = require('../email/mail')

const addMember = async ({ user, team, targetNickname, targetRole }) => {
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

  const nicknameQuery = new Parse.Query(Parse.User)
  nicknameQuery.equalTo('nickname', targetNickname)

  const emailQuery = new Parse.Query(Parse.User)
  emailQuery.equalTo('email', targetNickname)

  const userQuery = Parse.Query.or(nicknameQuery, emailQuery)
  const users = await userQuery.find()

  if (users.length === 0) {
    await sendTeamInvite({ user, parseTeam, targetEmail: targetNickname, role: targetRole })
    const refreshedTeam = await getTeam({ user, name: team })
    return refreshedTeam
  }

  const targetUser = users[0]
  const targetUserObj = targetUser.toJSON()
  const targetUserEmail = targetUserObj.username
  const targetUserNickname = targetUserObj.nickname
  const userNickname = user.nickname

  // will throw error before sending email
  console.log(`${targetRole}s`)
  console.log(parseTeam.get(`admins`))

  parseTeam.get(`${targetRole}s`).getUsers().add(targetUser)
  await parseTeam.get(`${targetRole}s`).save(null, { sessionToken: user.sessionToken })
  await parseTeam.save(null, { sessionToken: user.sessionToken })

  if (targetUserEmail && userNickname) {
    const messageTargetCollaborator = {
      from: `support@kyso.io`,
      to: targetUserEmail,
      subject: `${userNickname} has added you as an ${targetRole} on a Kyso team`,
      text: `<p>Hi ${targetUserNickname},</p>
      <p><a href="https://kyso.io/${userNickname}">@${userNickname}</a> has invited you to be an ${targetRole} on the Kyso team "${team}"</p>
      <p>Go to the <a href="https://kyso.io?team=${team}">${team} Dashboard</a> to see this teams studies.</p>
      <p>Best,</p>
      <p>The Kyso team</p>`
    }
    send(messageTargetCollaborator)
  }

  analytics.track('Added Member', {
    distinct_id: user.nickname,
    $user_id: user.nickname,
    Collaborator: targetNickname,
    Role: targetRole,
    Team: team
  })

  const refreshedTeam = await getTeam({ user, name: team })
  return refreshedTeam
}

addMember.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { targetNickname, targetRole, team } = req.body
    const study = await addMember({ user, targetNickname, targetRole, team })
    res.send(study)
  } catch (err) {
    next(err)
  }
}

module.exports = addMember
