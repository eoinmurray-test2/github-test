const cookie = require('cookie')
const retry = require('async-retry')
const fetch = require('isomorphic-fetch')
const logger = require('../../logger')

const awaitJupyterResponse = async ({ user, proxyUrl }) => {
  const checkTaskStatus = async () => {
    logger.info(`Pinging Jupyter ${proxyUrl}/lab`, cookie.serialize('user', JSON.stringify(user), { domain: 'kyso.io' }))
    const response = await fetch(`${proxyUrl}/lab`, {
      headers: {
        Cookie: cookie.serialize('user', JSON.stringify(user), { domain: 'kyso.io' })
      }
    })

    const text = await response.text()
    logger.info({ proxyUrl: `${proxyUrl}/lab`, status: response.status })
    if (response.status >= 400 || text === '') {
      throw new Error(text)
    } else {
      logger.info(`Recieved ping from Jupyterlab, success.`)
    }
  }

  const onRetry = () => logger.info(`Waiting for Jupyter to respond`)

  return retry(checkTaskStatus, {
    retries: 180,
    minTimeout: 200,
    maxTimeout: 500,
    onRetry
  })
}

module.exports = awaitJupyterResponse
