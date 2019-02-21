const { Parse } = require('../parse-rest')

const incrementViews = async ({ studyId }) => {
  const parseStudyObject = Parse.Object.extend('Study')
  const query = new Parse.Query(parseStudyObject)
  const parseStudy = await query.get(studyId, { useMasterKey: true })
  parseStudy.set('views', (parseStudy.get('views') || 0) + 1)
  await parseStudy.save(null, { useMasterKey: true })

  return parseStudy.toJSON()
}

incrementViews.handler = async (req, res, next) => {
  try {
    const { studyId } = req.body
    res.send(await incrementViews({ studyId }))
  } catch (err) {
    next(err)
  }
}

module.exports = incrementViews
