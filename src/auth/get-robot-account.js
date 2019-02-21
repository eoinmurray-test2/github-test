const querystring = require('querystring')
const fetch = require('node-fetch')

module.exports = async () => {
  const params = querystring.stringify({
    username: 'robot@kyso.io',
    password: process.env.PARSE_USER_PASSWORD
  })

  const res = await fetch(`${process.env.API_URL}/parse/login?${params}`, {
    method: 'get',
    headers: {
      'X-Parse-Application-Id': process.env.PARSE_APP_ID,
      'X-Parse-Master-Key': process.env.PARSE_MASTER_KEY
    },
  })
  return res.json()
}
