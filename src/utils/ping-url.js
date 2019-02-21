const fetch = require('isomorphic-fetch')

const ping = (pingUrl, sessionToken = '', count = 300) => new Promise(async (resolve, reject) => {
  if (count <= 0) {
    reject(new Error('Ping timed out (tried 50 times with 500ms interval) '))
  }

  try {
    await fetch(`${pingUrl}`, {
      method: 'POST',
      body: JSON.stringify({ userToken: sessionToken }),
      headers: { authorization: `bearer ${sessionToken}`, 'content-Type': 'application/json' }
    })

    resolve()
  } catch (err) {
    setTimeout(async () => {
      await ping(pingUrl, sessionToken, count - 1)
      resolve()
    }, 500)
  }
})

module.exports = ping
