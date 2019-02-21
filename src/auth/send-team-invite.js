const uuid = require('uuid/v4')
const { Parse, Invite } = require('../parse-rest')
const send = require('../email/mail')

const validateEmail = (email) => {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase())
}

module.exports = async ({ user, parseTeam, targetEmail, role }) => {
  if (!validateEmail(targetEmail)) {
    const err = new Error('Target user does not exist.')
    err.code = 403
    throw err
  }

  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  const inviteCode = uuid()

  const invite = new Invite()
  invite.set('sender', parseUser)
  invite.set('team', parseTeam)
  invite.set('code', inviteCode)
  invite.set('email', targetEmail)
  invite.set('role', role)
  invite.set('accepted', false)

  await invite.save(null, { sessionToken: user.sessionToken })

  const message = {
    from: `support@kyso.io`,
    to: targetEmail,
    subject: `${user.nickname} has added you as an admin on a Kyso team`,
    text: `<p>Hi ${targetEmail},</p>
    <p>
      <a href="${process.env.UI_URL}/${user.nickname}">@${user.nickname}</a> has invited you to be an
      ${role} on the Kyso team "${parseTeam.get('name')}"</p>
    <p>
      <a href="${process.env.UI_URL}/invitation/${parseTeam.get('name')}/${inviteCode}">
       Join ${parseTeam.get('name')}
      </a>
    </p>
    <p>Best,</p>
    <p>The Kyso team</p>`
  }
  send(message)

  return invite.toJSON()
}
