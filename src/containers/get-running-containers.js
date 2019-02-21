const { Parse, Container } = require('../parse-rest')

const getRunningContainers = async ({ user }) => {
  const query = new Parse.Query(Container)
  query.containedIn('state', ['RUNNING', 'STARTING', ''])
  query.limit(100000000)
  query.equalTo('cloud', 'aws')
  const containers = await query.find({ sessionToken: user.sessionToken })
  return containers.map(c => c.toJSON())
}

getRunningContainers.handler = async (req, res) =>
  res.send(await getRunningContainers({ user: req.user }))

module.exports = getRunningContainers
