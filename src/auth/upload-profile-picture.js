const fs = require('fs')
const uploadToParse = require('../utils/upload-to-parse')
const { Parse } = require('../parse-rest')

const uploadProfilePicture = async ({ user, filepath }) => {
  const parseUser = new Parse.User()
  parseUser.id = user.objectId
  const upload = await uploadToParse({ user, path: filepath, name: filepath.replace('/tmp/', '') })
  const _upload = Parse.File.fromJSON(upload)

  parseUser.set('profilePicture', _upload)
  parseUser.set('avatarUrl', _upload._url)
  await parseUser.save(null, { sessionToken: user.sessionToken })
  return parseUser.toJSON()
}

uploadProfilePicture.handler = async (req, res, next) => {
  try {
    const user = req.user
    const filepath = `/tmp/${user.objectId}-profile.jpg`
    await new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(filepath)
      req.pipe(stream)
      stream.on('close', () => resolve())
      stream.on('error', (error) => reject(error))
    })

    res.send(await uploadProfilePicture({ user, filepath }))
  } catch (err) {
    next(err)
  }
}

module.exports = uploadProfilePicture
