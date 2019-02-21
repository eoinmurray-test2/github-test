const fetch = require('isomorphic-fetch')

const addToProxy = async ({ source, target }) => {
  const res = await fetch(`${process.env.REVERSE_PROXY_ADDRESS}/add`, {
    method: 'post',
    body: JSON.stringify({
      domain: source,
      ip: target
    }),
    headers: {
      token: process.env.REVERSE_PROXY_TOKEN,
      'content-type': 'application/json'
    }
  })

  return res.json()
}

module.exports = addToProxy
