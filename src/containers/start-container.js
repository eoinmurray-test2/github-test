const ms = require('ms')
const moment = require('moment')
const email = require('../email/mail')
const analytics = require('../analytics')
const runTask = require('./ecs/run-task')
const stopTask = require('./ecs/stop-task')
const addToProxy = require('./add-to-proxy')
const awaitJupyterResponse = require('./ecs/await-jupyter-response')
const awaitTask = require('./ecs/await-task')
const removeFromProxy = require('./remove-from-proxy')
const { Parse, Container } = require('../parse-rest')
const downloadOntoContainer = require('./download-onto-container')
const describeEc2Instances = require('./ecs/describe-ec2-instance')
const registerTaskDefinition = require('./ecs/register-task-definition')
const deregisterTaskDefinition = require('./ecs/deregister-task-definition')
const describeContainerInstances = require('./ecs/describe-container-instance')
const logger = require('../logger')
const plans = require('../plans')

const startContainer = ({ user, containerId = null, parseContainer = null, clone = null }) =>
  new Promise(async (resolve, reject) => {
    const start = new Date()

    if (containerId) {
      const query = new Parse.Query(Container)
      parseContainer = await query.get(containerId, { sessionToken: user.sessionToken }) // eslint-disable-line
    }

    let task
    let containerAlias

    try {
      const parseUser = new Parse.User()
      parseUser.id = user.objectId
      const runningQuery = new Parse.Query(Container)
      runningQuery.equalTo('user', parseUser)
      runningQuery.equalTo('state', 'RUNNING')

      const startingQuery = new Parse.Query(Container)
      startingQuery.equalTo('user', parseUser)
      startingQuery.equalTo('state', 'STARTING')
      const countQuery = Parse.Query.or(runningQuery, startingQuery)
      const count = await countQuery.count({ sessionToken: user.sessionToken })

      if (count && !plans(user.plan)['multiple-workspaces']) {
        const err = new Error('You can only have one workspace running at a time on the free plan.')
        err._message = 'You can only have one workspace running at a time on the free plan.'
        err.code = 403
        throw err
      }

      parseContainer.set('state', 'STARTING')
      parseContainer.set('message', '')
      parseContainer.set('keepAlive', false)
      parseContainer.set('lastActivity', moment().toDate())
      parseContainer.add('startTimes', moment().toDate())
      await parseContainer.save(null, { sessionToken: user.sessionToken })
      resolve(parseContainer.toJSON())

      containerAlias = parseContainer.get('alias')

      const proxyUrl = `http://${containerAlias}.${process.env.REVERSE_PROXY_ADDRESS.replace('http://', '').replace('https://', '')}`
      parseContainer.set('proxyUrl', proxyUrl)

      let taskDefinitionName
      try {
        taskDefinitionName = await registerTaskDefinition({ containerAlias, user })
      } catch (err) {
        err._message = 'Failed register task definition'
        throw err
      }

      try {
        task = await runTask({ cluster: 'jupyterlab', taskDefinitionName })
      } catch (err) {
        if (err.message.startsWith('RESOURCE:')) {
          err._message = 'Kyso cluster at max capacity, please wait a few minutes'
          email({
            to: 'support@kyso.io',
            subject: 'Cluster at max capacity',
            text: `User: ${user.nickname} recieved this error at ${moment().format('MMMM Do YYYY, h:mm:ss a')} UTC`,
            from: 'api@kyso.io'
          })
        } else {
          logger.error(err)
          err._message = 'Unknown error happened when trying to run task on Kyso cluster'
        }
        throw err
      }

      parseContainer.set('taskArn', task.taskArn)
      await parseContainer.save(null, { sessionToken: user.sessionToken })

      const containerInstanceArn = task.containerInstanceArn
      const containerInstance = await describeContainerInstances({ cluster: 'jupyterlab', containerInstanceArn })

      const ec2Instance = await describeEc2Instances({ instanceId: containerInstance.ec2InstanceId })
      const target = `${ec2Instance.PublicDnsName}:8888`

      try {
        await addToProxy({ source: proxyUrl.replace('http://', ''), target })
      } catch (err) {
        err._message = 'Failed to add container to Kyso proxy'
        throw err
      }
      parseContainer.set('target', target)
      await parseContainer.save(null, { sessionToken: user.sessionToken })

      try {
        await awaitTask({ cluster: 'jupyterlab', taskArn: task.taskArn })
      } catch (err) {
        err._message = 'Operation timed out (code: 142)'
        throw err
      }

      try {
        await awaitJupyterResponse({ user, proxyUrl })
      } catch (err) {
        err._message = 'Operation timed out (code: 452)'
        throw err
      }

      // add clone download code here
      if (clone) {
        await downloadOntoContainer({
          user,
          url: clone.url,
          alias: parseContainer.get('alias'),
          update: clone.update ? `${clone.author}/${clone.name}` : false
        })
      }

      parseContainer.set('state', 'RUNNING')
      await parseContainer.save(null, { sessionToken: user.sessionToken })
      logger.info(`Started ${proxyUrl} in ${ms(new Date() - start)}`)
      analytics.track('Started Workspace', {
        $user_id: user.nickname,
        distinct_id: user.nickname,
        'Container Id': parseContainer.id
      })
    } catch (err) {
      logger.error(err)
      parseContainer.set('state', 'ERROR')
      parseContainer.set('message', err._message)
      await parseContainer.save(null, { sessionToken: user.sessionToken })

      if (task && task.taskArn) {
        logger.info(`stopping task ${task.taskArn}`)
        await stopTask({ task: task.taskArn, cluster: 'jupyterlab' })
        logger.info('deregistering taskDefinition')
        await deregisterTaskDefinition({ taskDefinition: task.taskDefinitionArn })
        logger.info('removing from proxy')
        await removeFromProxy({ source: `${containerAlias}.${process.env.REVERSE_PROXY_ADDRESS.replace('http://', '').replace('https://', '')}` })
      }

      reject(parseContainer.toJSON())
    }
  })


startContainer.handler = async (req, res, next) => {
  const { containerId } = req.body
  const user = req.user

  try {
    res.send(await startContainer({ user, containerId }))
  } catch (err) {
    next(err)
  }
}

module.exports = startContainer
