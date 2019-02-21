const fetch = require('isomorphic-fetch')
const fs = require('fs-extra')
const { Parse, ParseAppId } = require('../parse-rest')


module.exports = async ({ path, name, user = null, masterKey = null }) => {
  const fstream = fs.createReadStream(path)
  const opts = {
    method: 'POST',
    body: fstream,
    headers: {
      'x-parse-application-id': ParseAppId,
    }
  }

  if (masterKey) {
    opts.headers['x-parse-master-key'] = masterKey
  } else {
    opts.headers['x-parse-session-token'] = user.sessionToken
  }

  const uploadReq = await fetch(`${Parse.serverURL}/files/file-${name}`, opts)
  const upload = await uploadReq.json()

  if (Object.prototype.hasOwnProperty.call(upload, 'error')) {
    throw { message: `${name}: ${upload.error}`, filename: name } // eslint-disable-line
  }

  upload.__type = 'File' // eslint-disable-line
  return upload
}
