const Parse = require('parse/node')

Parse.initialize(process.env.PARSE_APP_ID, '', process.env.PARSE_MASTER_KEY)
Parse.serverURL = `${process.env.API_URL}/parse`

const Image = Parse.Object.extend('Image')
const File = Parse.Object.extend('File')
const Team = Parse.Object.extend('Team')
const Tag = Parse.Object.extend('Tag')
const Invite = Parse.Object.extend('Invite')
const Comment = Parse.Object.extend('Comment')

const Version = Parse.Object.extend('Version', {
  fullJSON: function fullJSON() {
    const json = this.toJSON()

    if (json.filesArray) {
      json.filesArray = this.get('filesArray').map(file => file.toJSON())
    }

    return json
  }
})

const Container = Parse.Object.extend('Container', {
  publicJSON: function publicJSON() {
    const json = this.toJSON()
    if (json.instance) {
      delete json.instance.internalIp
      delete json.instance.externalIp
      delete json.instance.instanceName
    }

    return json
  }
})

const Study = Parse.Object.extend('Study', {}, {
  findBySlug: async function findBySlug(slug, user) {
    try {
      const { author, name, sha } = this.parseSlug(slug)

      const query = new Parse.Query(Parse.Object.extend('Study'))
      query.notEqualTo('state', 'DELETED')
      query.equalTo('author', author)
      query.equalTo('name', name)
      query.include('versionsArray')
      query.include('versionsArray.filesArray')
      query.include('stargazers')

      const studies = await query.find({ sessionToken: user.sessionToken })
      if (studies.length === 0) {
        return { study: null, version: null }
      }

      const study = studies[0]
      let version = null
      if (sha) {
        version = study.get('versionsArray').find(v => v.get('sha').startsWith(sha))
      } else if (version) {
        version = study.get('versionsArray')[0]
      }

      return { study, version }
    } catch (err) {
      return { study: null, version: null }
    }
  },

  parseSlug: function parseSlug(slug) {
    const author = slug.split('/')[0]
    let name = slug.split('/')[1]
    let sha = null

    if (name.includes('#')) {
      sha = name.split('#')[1]
      name = name.split('#')[0]

      if (sha.length < 6) {
        const err = new Error(`Version sha must have at least 6-digits.`)
        err.userError = true
        throw err
      }
    }
    return { author, name, sha }
  }
})

module.exports = {
  Parse,
  Team,
  Version,
  Study,
  File,
  Image,
  Container,
  Tag,
  Comment,
  Invite,
  ParseAppId: process.env.PARSE_APP_ID
}
