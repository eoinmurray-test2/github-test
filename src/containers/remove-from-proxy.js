const fetch = require('isomorphic-fetch')
const logger = require('../logger')

const removeFromProxy = async ({ source }) => {
  logger.debug(`Removing https://${source} from proxy`)
  const res = await fetch(`${process.env.REVERSE_PROXY_ADDRESS}/remove`, {
    method: 'post',
    body: JSON.stringify({
      domain: source,
    }),
    headers: {
      token: process.env.REVERSE_PROXY_TOKEN,
      'content-type': 'application/json'
    }
  })

  return res.json()
}

module.exports = removeFromProxy
