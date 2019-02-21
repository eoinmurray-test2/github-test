const analytics = require('../analytics')
const { Parse, Study } = require('../parse-rest')
const plans = require('../plans')

const togglePrivate = async ({ user, studyId, privacy }) => {
  const query = new Parse.Query(Study)
  const study = await query.get(studyId, { sessionToken: user.sessionToken })

  const acl = study.getACL()

  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  if (privacy === 'private') {
    if (!plans(user.plan)['private-studies'] && !study.team) {
      const err = new Error('You cannot have private studies on the free plan.')
      err.code = 403
      throw err
    }
    acl.setPublicReadAccess(false)
  } else {
    acl.setPublicReadAccess(true)
  }

  study.setACL(acl)
  await study.save(null, { sessionToken: user.sessionToken })

  const versionQuery = new Parse.Query(Parse.Object.extend('Version'))
  versionQuery.equalTo('study', study)
  const versions = await versionQuery.find({ sessionToken: user.sessionToken })
  versions.forEach(async (version) => {
    version.setACL(acl)
    await version.save(null, { sessionToken: user.sessionToken })
  })

  const fileQuery = new Parse.Query(Parse.Object.extend('File'))
  fileQuery.equalTo('study', study)
  const files = await fileQuery.find({ sessionToken: user.sessionToken })
  files.forEach(async (file) => {
    file.setACL(acl)
    await file.save(null, { sessionToken: user.sessionToken })
  })

  analytics.track('Changed Privacy Status', {
    distinct_id: user.nickname,
    $user_id: user.nickname,
    'Study Author': study.toJSON().user.nickname,
    'Study Name': study.toJSON().name,
    'Study Id': study.toJSON().objectId,
    'Study Fullname': `${study.toJSON().user.nickname}/${study.toJSON().name}`,
    'Current Privacy Setting': privacy
  })

  return study.toJSON()
}

togglePrivate.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { studyId, privacy } = req.body
    const study = await togglePrivate({ user, studyId, privacy })
    res.send(study)
  } catch (err) {
    next(err)
  }
}

module.exports = togglePrivate
