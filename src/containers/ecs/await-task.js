const retry = require('async-retry')
const getTask = require('./get-task')
const logger = require('../../logger')

const awaitTask = async ({ cluster, taskArn }) => {
  const checkTaskStatus = async () => {
    const task = await getTask({ cluster, taskArn })
    const { lastStatus, desiredStatus } = task

    if (lastStatus !== desiredStatus) {
      throw new Error('not ready')
    }
  }

  const onRetry = () => logger.info(`Waiting for task to be running`)

  return retry(checkTaskStatus, { retries: 500, minTimeout: 200, maxTimeout: 500, onRetry })
}

module.exports = awaitTask
