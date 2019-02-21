const retry = require('async-retry')
const getContainer = require('../get-container')
const logger = require('../../logger')

const awaitTask = async ({ user, containerId, state = 'RUNNING' }) => {
  const checkTaskStatus = async () => {
    const container = await getContainer({ user, containerId })
    if (container.state !== state) {
      throw new Error('not ready')
    }
  }

  const onRetry = () => logger.info(`Waiting for task to be running`)

  return retry(checkTaskStatus, { retries: 30, minTimeout: 200, maxTimeout: 500, onRetry })
}

module.exports = awaitTask
