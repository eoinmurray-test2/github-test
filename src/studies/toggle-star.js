const analytics = require('../analytics')
const { Parse, Study } = require('../parse-rest')
const send = require('../email/mail')

const toggleStar = async ({ user, studyId }) => {
  const query = new Parse.Query(Study)
  query.include('user')
  const study = await query.get(studyId, { sessionToken: user.sessionToken })
  const parseStudy = await query.get(studyId)
  const studyObject = parseStudy.toJSON()

  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  const ownerNickname = studyObject.user.nickname
  const ownerEmail = studyObject.user.username
  const studyName = studyObject.name
  const stargazersNickname = user.nickname

  if ((study.get('stargazers') || []).map(s => s.id).indexOf(user.objectId) > -1) {
    analytics.track('Unstarred Study', {
      distinct_id: user.nickname,
      $user_id: user.nickname,
      'Study Author': study.toJSON().user.nickname,
      'Study Name': study.toJSON().name,
      'Study Id': study.toJSON().objectId,
      'Study Fullname': `${user.nickname}/${study.toJSON().name}`
    })

    study.remove('stargazers', parseUser)
  } else {
    study.addUnique('stargazers', parseUser)

    analytics.track('Starred Study', {
      distinct_id: user.nickname,
      $user_id: user.nickname,
      'Study Author': study.toJSON().user.nickname,
      'Study Name': study.toJSON().name,
      'Study Id': study.toJSON().objectId,
      'Study Fullname': `${user.nickname}/${study.toJSON().name}`
    })

    if (ownerNickname !== stargazersNickname) {
      const message = {
        from: `support@kyso.io`,
        to: ownerEmail,
        subject: `Congrats! Your Kyso study "${studyName}" has received a new star`,
        text: `<p>Hey ${ownerNickname},</p>
        <p>Your study "${studyName}" has been stared by
          <a href="https://kyso.io/${stargazersNickname}">@${stargazersNickname}</a>
        </p>
        <p>Click this link to view the study: <a href="https://kyso.io/${ownerNickname}/${studyName}">https://kyso.io/${ownerNickname}/${studyName}</a> </p>
        <p>Cheers,</p>
        <p>Kyso team</p>`
      }
      send(message)
    }
  }

  study.set('stars', study.get('stargazers').length)
  await study.save(null, { useMasterKey: true })

  return study.toJSON()
}

toggleStar.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { studyId } = req.body
    const study = await toggleStar({ user, studyId })
    res.send(study)
  } catch (err) {
    next(err)
  }
}

module.exports = toggleStar
