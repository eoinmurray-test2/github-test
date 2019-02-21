const { Parse, Study } = require('../parse-rest')

const setStudyVisibility = async ({ user, studyId, visibility }) => {
  const query = new Parse.Query(Study)
  const study = await query.get(studyId, { sessionToken: user.sessionToken })

  study.set('visibility', visibility)

  await study.save(null, { sessionToken: user.sessionToken })

  return study.toJSON()
}

setStudyVisibility.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { studyId, visibility } = req.body
    const study = await setStudyVisibility({ user, studyId, visibility })
    res.send(study)
  } catch (err) {
    next(err)
  }
}

module.exports = setStudyVisibility
