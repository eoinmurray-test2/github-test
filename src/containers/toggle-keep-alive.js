const plans = require('../plans')
const analytics = require('../analytics')
const { Parse, Container } = require('../parse-rest')

const toggleKeepAlive = async ({ user, containerId }) => {
  if (plans(user.plan)['max-lifetime-per-workspace']) {
    const err = new Error('Workspaces have a max lifetime of 3hrs on the free plan.')
    err._message = 'Workspaces have a max lifetime of 3hrs on the free plan.'
    err.code = 403
    throw err
  }

  const query = new Parse.Query(Container)
  query.include('user')
  const container = await query.get(containerId, { sessionToken: user.sessionToken })

  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  if (container.get('keepAlive')) {
    container.set('keepAlive', false)
  } else {
    container.set('keepAlive', true)
  }

  await container.save(null, { sessionToken: user.sessionToken })
  return container.toJSON()
}

toggleKeepAlive.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { containerId } = req.body
    const study = await toggleKeepAlive({ user, containerId })
    res.send(study)
  } catch (err) {
    next(err)
  }
}

module.exports = toggleKeepAlive
