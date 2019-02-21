const { Parse, Study } = require('../parse-rest')

const setStudyDescription = async ({ user, studyId, text }) => {
  const query = new Parse.Query(Study)
  const parseStudy = await query.get(studyId, { sessionToken: user.sessionToken })

  parseStudy.set('description', text)

  await parseStudy.save(null, { sessionToken: user.sessionToken })
  return parseStudy.toJSON()
}

setStudyDescription.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { text, studyId } = req.body

    res.send(await setStudyDescription({ user, studyId, text }))
  } catch (err) {
    next(err)
  }
}

module.exports = setStudyDescription
