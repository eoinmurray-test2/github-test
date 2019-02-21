const { Parse, Container } = require('../parse-rest')

const getContainer = async ({
  user,
  taskArn = null,
  proxyUrl = null,
  containerId = null
}) => {
  let container
  const query = new Parse.Query(Container)

  if (containerId) {
    container = await query.get(containerId, { sessionToken: user.sessionToken })
  } else if (proxyUrl) {
    query.equalTo('proxyUrl', proxyUrl)
    const results = await query.find({ sessionToken: user.sessionToken })
    if (results && results.length > 0) { container = results[0] }
  } else if (taskArn) {
    query.equalTo('taskArn', taskArn)
    const results = await query.find({ sessionToken: user.sessionToken })
    if (results && results.length > 0) { container = results[0] }
  }

  if (container) return container.toJSON()
  return null
}

getContainer.handler = async (req, res) => {
  const { proxyUrl, containerId } = req.body

  const container = await getContainer({ user: req.user, proxyUrl, containerId })
  if (container) {
    res.send(container)
  } else {
    res.status(404).send({ result: 'not found' })
  }
}

module.exports = getContainer
