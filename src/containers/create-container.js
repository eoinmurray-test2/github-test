const analytics = require('../analytics')
const getTeam = require('../auth/get-team')
const getStudy = require('../studies/get-study')
const startContainer = require('./start-container')
const { Parse, Container } = require('../parse-rest')
const doesUserHaveRole = require('../auth/does-user-have-role')

const checkIfNameExists = async ({ name, user, team }) => {
  const parseUser = new Parse.User()
  parseUser.id = user.objectId
  const query = new Parse.Query(Container)
  query.equalTo('name', `${name}`)
  query.equalTo('user', parseUser)
  query.notEqualTo('state', 'TERMINATED')
  const count = await query.count({ sessionToken: user.sessionToken })

  if (count) {
    return true
  }
  return false
}

const createContainer = ({ user, name, team, clone = null }) => new Promise(async (resolve, reject) => {
  const parseContainer = new Container()
  const parseUser = new Parse.User()
  parseUser.id = user.objectId

  let exists = false
  try {
    exists = await checkIfNameExists({ name, user })
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

    let parseTeam
    const acl = new Parse.ACL()
    acl.setPublicReadAccess(false)
    acl.setPublicWriteAccess(false)
    acl.setWriteAccess('role:kyso', true)
    acl.setReadAccess('role:kyso', true)

    if (team) {
      parseTeam = await getTeam({ user, name: team, parseObject: true })

      const isEditor = await doesUserHaveRole({ user, teamname: parseTeam.get('name'), role: 'editor' })
      const isAdmin = await doesUserHaveRole({ user, teamname: parseTeam.get('name'), role: 'admin' })
      if (!isEditor && !isAdmin) {
        const err = new Error('You are not an editor or admin of this team, you cannot start workspaces.')
        err.code = 403
        throw err
      }

      if (!team) {
        const err = new Error('Team does not exist, or you do not have access.')
        err.code = 403
        throw err
      }

      parseContainer.set('team', parseTeam)
      acl.setWriteAccess(parseTeam.get('editors'), true)
      acl.setReadAccess(parseTeam.get('editors'), true)
    } else {
      acl.setWriteAccess(user.objectId, true)
      acl.setReadAccess(user.objectId, true)
    }

    parseContainer.setACL(acl)

    parseContainer.set('user', parseUser)
    parseContainer.set('cloud', 'aws')
    parseContainer.set('name', name)
    await parseContainer.save(null, { sessionToken: user.sessionToken })
    const containerAlias = `${parseContainer.get('name')}-${parseContainer.id.toLowerCase()}`
    parseContainer.set('alias', containerAlias)

    await parseContainer.save(null, { sessionToken: user.sessionToken })

    resolve(parseContainer.toJSON())

    if (!clone) {
      const study = await getStudy({ user, author: 'eoin', name: 'getting-started-welcome-notebook' })
      let version = (study && study.versionsArray) ? study.versionsArray[0] : []
      // version = await createVersionZip(version)
      clone = {
        url: version.zip.url,
        author: 'eoin',
        name: 'getting-started-welcome-notebook'
      }
    }

    await startContainer({ user, parseContainer, clone })

    analytics.track('Created Workspace', {
      distinct_id: user.nickname,
      $user_id: user.nickname,
      'Container Id': parseContainer.id,
      New: !exists,
    })
  } catch (err) {
    console.error(err)
    reject(err)
  }
})


createContainer.handler = async (req, res, next) => {
  const { name, team } = req.body
  const user = req.user

  try {
    res.send(await createContainer({ user, name, team }))
  } catch (err) {
    next(err)
  }
}

module.exports = createContainer
