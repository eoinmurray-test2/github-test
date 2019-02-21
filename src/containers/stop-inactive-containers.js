const getStaleContainers = require('./get-stale-containers')
const stopContainer = require('./stop-container')
// const send = require('../email/mail')
const logger = require('../logger')

const stopInactiveContainers = async ({ staleTime = 5 /* minutes */ } = {}) => {
  const containers = await getStaleContainers({ staleTime })
  await Promise.all(containers.map(container => new Promise(async (resolve, reject) => {
    logger.debug(`Stopping for inactivity: ${container.objectId} - ${container.name}, ${container.user.nickname} (${container.user.email})`)
    await stopContainer({ containerId: container.objectId, useMasterKey: true })
    // await send({
    //   to: container.user.email,
    //   subject: `Shutdown long running Kyso Jupyterlab`,
    //   text: `
    //   Your Jupyterlab environment ${container.name} has been idle for more than 30minutes.
    //
    //   So we have shut it down. Don't worry, your files are safe, you can restart it whenever
    //   you wish at https://kyso.io
    //
    //   Reply to this email or contact support@kyso.io if you have any questions.
    //
    //   Thank you!
    //   `,
    //   from: 'support@kyso.io'
    // })
    resolve()
  })))

  return containers
}

module.exports = stopInactiveContainers
