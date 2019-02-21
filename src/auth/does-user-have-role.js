const { Parse } = require('../parse-rest')

module.exports = async ({ user, teamname, role }) => {
  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  console.log({ user, teamname, role })

  const RoleQuery = new Parse.Query(Parse.Role)
  RoleQuery.equalTo('name', `${teamname}-${role}s`)
  // RoleQuery.equalTo('users', parseUser)
  const _role = await RoleQuery.first({ sessionToken: user.sessionToken })
  if (!_role) {
    return false
  }

  return true
}
