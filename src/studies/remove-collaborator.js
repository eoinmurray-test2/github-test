const analytics = require('../analytics')
const { Parse, Study } = require('../parse-rest')
const plans = require('../plans')

const removeCollaborator = async ({ user, targetNickname, studyId }) => {
  if (!plans(user.plan)['private-studies']) {
    const err = new Error('You cannot have private studies and collaborators on the free plan.')
    err.code = 403
    throw err
  }

  const query = new Parse.Query(Study)
  query.include('collaborators')
  const study = await query.get(studyId, { sessionToken: user.sessionToken })

  if (!study) {
    const err = new Error('Study not found.')
    err.code = 403
    throw err
  }

  const userQuery = new Parse.Query(Parse.User)
  userQuery.equalTo('nickname', targetNickname)
  const users = await userQuery.find()

  if (users.length === 0) {
    const err = new Error('Target user does not exist.')
    err.code = 403
    throw err
  }

  const acl = study.getACL()

  acl.setReadAccess(users[0], false)
  // acl.setWriteAccess(users[0], true)

  study.remove('collaborators', users[0])

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

  analytics.track('Removed Collaborator', {
    distinct_id: user.nickname,
    $user_id: user.nickname,
    Collaborator: targetNickname,
    'Study Author': study.toJSON().user.nickname,
    'Study Name': study.toJSON().name,
    'Study Id': study.toJSON().objectId,
    'Study Fullname': `${study.toJSON().user.nickname}/${study.toJSON().name}`
  })

  const _query = new Parse.Query(Study)
  _query.include('collaborators')
  const _study = await _query.get(studyId, { sessionToken: user.sessionToken })

  return {
    ..._study.toJSON()
  }
}

removeCollaborator.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { targetNickname, studyId } = req.body
    const study = await removeCollaborator({ user, targetNickname, studyId })
    res.send(study)
  } catch (err) {
    next(err)
  }
}

module.exports = removeCollaborator
