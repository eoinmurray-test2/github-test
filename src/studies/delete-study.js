const analytics = require('../analytics')
const { Parse, Study } = require('../parse-rest')

const deleteStudy = async ({ user, studyId }) => {
  try {
    const query = new Parse.Query(Study)
    const study = await query.get(studyId, { sessionToken: user.sessionToken })

    study.set('state', 'DELETED')
    await study.save(null, { sessionToken: user.sessionToken })

    analytics.track('Deleted Study', {
      distinct_id: user.nickname,
      $user_id: user.nickname,
      'Study Author': study.toJSON().user.nickname,
      'Study Name': study.toJSON().name,
      'Study Id': study.toJSON().objectId,
      'Study Fullname': `${study.toJSON().user.nickname}/${study.toJSON().name}`,
    })

    return study.toJSON()
  } catch (err) {
    throw err
  }
}

deleteStudy.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { studyId } = req.body

    const study = await deleteStudy({ user, studyId })
    return res.send(await study)
  } catch (err) {
    return next(err)
  }
}


module.exports = deleteStudy
