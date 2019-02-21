const analytics = require('../analytics')
const stopContainer = require('./stop-container')
const { Parse, Container } = require('../parse-rest')

const deleteContainer = ({ user, containerId }) => new Promise(async (resolve) => {
  const query = new Parse.Query(Container)
  const parseContainer = await query.get(containerId, { sessionToken: user.sessionToken })

  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  if (parseContainer.get('state') === 'STOPPED') {
    parseContainer.set('state', 'TERMINATED')
    await parseContainer.save(null, { sessionToken: user.sessionToken })
    return resolve(parseContainer.toJSON())
  }

  resolve(parseContainer.toJSON())
  await stopContainer({ user, parseContainer, finalState: 'TERMINATED' })

  analytics.track('Deleted Workspace', {
    distinct_id: user.nickname,
    $user_id: user.nickname,
    'Container Id': parseContainer.id
  })
})


deleteContainer.handler = async (req, res, next) => {
  const { containerId } = req.body
  const user = req.user

  try {
    res.send(await deleteContainer({ user, containerId }))
  } catch (err) {
    next(err)
  }
}

module.exports = deleteContainer
