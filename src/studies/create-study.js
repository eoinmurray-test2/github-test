const { Parse, Study } = require('../parse-rest')
const getTeam = require('../auth/get-team')

const slugPattern = new RegExp('^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$')

const checkIfNameExists = async ({ name, user }) => {
  const parseUser = new Parse.User()
  parseUser.id = user.objectId
  const query = new Parse.Query(Study)
  query.equalTo('name', `${name}`)
  query.equalTo('user', parseUser)
  query.notEqualTo('state', 'DELETED')
  const count = await query.count({ sessionToken: user.sessionToken })

  if (count) {
    return true
  }
  return false
}

const createStudy = async ({
  user,
  name,
  team,
  title,
  description,
  tags,
  requestPrivate = false,
  incrementName = false,
  githubId = false,
  githubOwner = false,
  hookId = false
}) => {
  try {
    if (!slugPattern.test(name)) {
      throw new Error(`Study name can only consist of letters, numbers, '_' and '-'. ${name} didnt match.`)
    }

    name = name.toString().toLowerCase() // eslint-disable-line
      .replace(/\s+/g, '-')     // Replace spaces with
      .replace(/[^\w\-]+/g, '') // Remove eslint-disable-line
      .replace(/\-\-+/g, '-')   // Replace multiple - with single
      .replace(/^-+/, '')       // Trim - from start of text
      .replace(/-+$/, '')

    const parseUser = new Parse.User()
    parseUser.id = user.objectId

    const exists = await checkIfNameExists({ name, user })

    if (exists && !incrementName) {
      throw new Error(`Study ${user.nickname}/${name} already exists.`)
    }

    if (exists) {
      if (name.match(/\-\d+$/)) {
        name = name.replace(/\d+$/, n => ++n)
      } else {
        name = `${name}-2`
        let incExists = true
        while (incExists) {
          incExists = await checkIfNameExists({ name, user })
          if (incExists) {
            name = name.replace(/\d+$/, n => ++n)
          }
        }
      }
    }

    const acl = new Parse.ACL(parseUser)

    if (!requestPrivate) {
      acl.setPublicReadAccess(true)
    }

    acl.setWriteAccess('role:kyso', true)
    acl.setReadAccess('role:kyso', true)

    const study = new Study()
    study.setACL(acl)
    study.set('name', name)
    study.set('title', title)
    study.set('description', description)
    study.set('tags', tags)
    study.set('user', parseUser)
    study.set('numberOfComments', 0)
    study.set('requestPrivate', requestPrivate)

    if (githubId) { study.set('githubId', githubId) }
    if (githubOwner) { study.set('githubOwner', githubOwner) }
    if (hookId) { study.set('hookId', hookId) }

    let parseTeam
    if (team) {
      parseTeam = await getTeam({ user, name: team, parseObject: true })
      if (!team) {
        const err = new Error('Team does not exist, or you do not have access.')
        err.code = 403
        throw err
      }
      study.set('team', parseTeam)
    }

    await study.save(null, { sessionToken: user.sessionToken })
    return study.toJSON()
  } catch (err) {
    throw new Error(err)
  }
}

createStudy.handler = async (req, res, next) => {
  try {
    const user = req.user
    const { name, author, requestPrivate } = req.body
    const study = await createStudy({ user, name, author, requestPrivate })
    return res.send(study)
  } catch (err) {
    return next(err)
  }
}

module.exports = createStudy
