const { Parse, Study } = require('../parse-rest')

const setStudyTitle = async ({ user, studyId, title, }) => {
  const query = new Parse.Query(Study)
  const parseStudy = await query.get(studyId, { sessionToken: user.sessionToken })
  parseStudy.set('title', title)
  console.log(parseStudy)

  await parseStudy.save(null, { sessionToken: user.sessionToken })
  return parseStudy.toJSON()
}

setStudyTitle.handler = async (req, res, next) => {
  try {
    const user = req.user

    const { title, studyId } = req.body

    res.send(await setStudyTitle({ user, studyId, title }))
  } catch (err) {
    next(err)
  }
}

module.exports = setStudyTitle
