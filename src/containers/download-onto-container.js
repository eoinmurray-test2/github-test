const fetch = require('isomorphic-fetch')

const downloadOntoContainer = async ({ user, url, alias, update }) => {
  const res = await fetch(`${process.env.REVERSE_PROXY_ADDRESS}/clone`, {
    method: 'post',
    body: JSON.stringify({
      url,
      alias,
      update,
      userToken: user.sessionToken
    }),
    headers: {
      token: process.env.REVERSE_PROXY_TOKEN,
      'content-type': 'application/json'
    }
  })

  return res.json()
}

module.exports = downloadOntoContainer
