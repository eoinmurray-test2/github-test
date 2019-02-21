const fetch = require('isomorphic-fetch')
const { logger } = require('../logs')

module.exports = async ({ subdomain, ip }) => {
  logger.info(`Aliasing http://${subdomain}.kyso.sh to ${ip}`)

  const dnsReq = await fetch(`http://kyso.sh/add`, {
    method: 'post',
    headers: {
      token: `${process.env.REVERSE_PROXY_TOKEN}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      domain: `${subdomain}.kyso.sh`,
      ip
    })
  })

  if (!dnsReq.ok) {
    throw new Error(await dnsReq.text())
  }
}
