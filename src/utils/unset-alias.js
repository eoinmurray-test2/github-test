const fetch = require('isomorphic-fetch')

module.exports = async ({ subdomain }) => {
  const dnsReq = await fetch(`http://kyso.sh/remove`, {
    method: 'post',
    headers: {
      token: `${process.env.REVERSE_PROXY_TOKEN}`,
    },
    body: JSON.stringify({
      domain: `${subdomain}.kyso.sh`,
    })
  })

  if (!dnsReq.ok) {
    throw new Error(await dnsReq.text())
  }
}
