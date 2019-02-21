const moment = require('moment')
const analytics = require('../analytics')
const stopTask = require('./ecs/stop-task')
const removeFromProxy = require('./remove-from-proxy')
const { Parse, Container } = require('../parse-rest')
const deregisterTaskDefinition = require('./ecs/deregister-task-definition')
const logger = require('../logger')

const stopContainer = ({
  containerId = null,
  parseContainer = null,
  user = null,
  useMasterKey = false,
  finalState = 'STOPPED'
}) =>
  new Promise(async (resolve) => {
    let saveOpts = {}
    if (user) {
      saveOpts = { sessionToken: user.sessionToken }
    } else {
      saveOpts = { useMasterKey }
    }

    if (containerId) {
      const query = new Parse.Query(Container)
      parseContainer = await query.get(containerId, saveOpts) // eslint-disable-line
    }

    parseContainer.add('stopTimes', moment().toDate())
    parseContainer.set('state', 'STOPPING')
    parseContainer.set('keepAlive', false)
    await parseContainer.save(null, saveOpts)
    resolve(parseContainer.toJSON())

    try {
      logger.debug('stopping task')
      const task = await stopTask({ task: parseContainer.get('taskArn'), cluster: 'jupyterlab' })
      logger.debug('deregistering taskDefinition')
      await deregisterTaskDefinition({ taskDefinition: task.taskDefinitionArn })
    } catch (err) {
      logger.error(err)
    }

    parseContainer.set('state', finalState)
    await parseContainer.save(null, saveOpts)
    analytics.track('Stopped Workspace', {
      distinct_id: user.nickname,
      $user_id: user.nickname,
      'Container Id': parseContainer.id
    })
    try {
      logger.debug('removing from proxy')
      await removeFromProxy({ source: `${parseContainer.get('alias')}.${process.env.REVERSE_PROXY_ADDRESS.replace('http://', '').replace('https://', '')}` })
    } catch (err) {
      logger.error(err)
    }
  })


stopContainer.handler = async (req, res, next) => {
  const { containerId } = req.body
  const user = req.user

  try {
    res.send(await stopContainer({ user, containerId }))
  } catch (err) {
    next(err)
  }
}

module.exports = stopContainer
