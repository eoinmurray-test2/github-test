const { Parse, Version } = require('../parse-rest')

const getVersion = async ({ user, versionId }) => {
  const query = new Parse.Query(Version)
  const version = await query.get(versionId, { sessionToken: user.sessionToken })
  return version.toJSON()
}

getVersion.handler = async (req, res, next) => {
  try {
    const { versionId } = req.body
    const user = req.user
    res.send(await getVersion({ user, versionId }))
  } catch (err) {
    next(err)
  }
}

module.exports = getVersion
