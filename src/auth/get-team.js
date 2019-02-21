const { Parse, Team } = require('../parse-rest')

const getTeam = async ({ user = null, name, parseObject = false }) => {
  let sessionToken = null
  if (user) sessionToken = user.sessionToken

  const query = new Parse.Query(Team)
  query.equalTo('name', name)
  query.include('admins')
  query.include('editors')
  query.include('viewers')

  const teams = await query.find({ sessionToken })
  if (teams.length === 0) {
    return null
  }

  const team = teams[0]

  const admins = (await team.get('admins')
    .getUsers().query().find({ sessionToken }))
    .map(a => a.toJSON())

  const editors = (await team.get('editors')
    .getUsers().query().find({ sessionToken }))
    .map(a => a.toJSON())

  const viewers = (await team.get('viewers')
    .getUsers().query().find({ sessionToken }))
    .map(a => a.toJSON())

  if (parseObject) {
    return team
  }

  return {
    ...team.toJSON(),
    admins: {
      ...team.admins,
      users: admins
    },
    editors: {
      ...team.editors,
      users: editors
    },
    viewers: {
      ...team.viewers,
      users: viewers
    },
  }
}

getTeam.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { team } = req.body
    res.send(await getTeam({ user, name: team }))
  } catch (err) {
    next(err)
  }
}

module.exports = getTeam
