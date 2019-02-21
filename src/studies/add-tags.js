const { Parse, Tag, Study } = require('../parse-rest')

const addTags = async ({ user, studyId, tags }) => {
  const query = new Parse.Query(Study)
  const study = await query.get(studyId, { sessionToken: user.sessionToken })
  
  study.set('tags', tags)
  await study.save(null, { sessionToken: user.sessionToken })

  tags.map(async (tag) => {
    const tagQuery = new Parse.Query(Tag)
    tagQuery.equalTo('tag', tag)
    const result = await tagQuery.find()

    if (result.length === 0) {
      const _tag = new Tag()
      _tag.set('tag', tag)
      await _tag.save()
    }
  })

  return study.toJSON()
}

addTags.handler = async (req, res, next) => {
  const { studyId, tags } = req.body
  const user = req.user
  try {
    res.send(await addTags({ user, studyId, tags }))
  } catch (err) {
    next(err)
  }
}

module.exports = addTags
