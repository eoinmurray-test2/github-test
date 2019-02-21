const { Parse, Tag } = require('../parse-rest')

const getTagSuggestions = async () => {
  const query = new Parse.Query(Tag)
  query.limit(100000)
  const tags = await query.find()
  return tags.map(t => t.toJSON())
}

getTagSuggestions.handler = async (req, res, next) => {
  const { studyId, tags } = req.body
  const user = req.user
  try {
    res.send(await getTagSuggestions({ user, studyId, tags }))
  } catch (err) {
    next(err)
  }
}

module.exports = getTagSuggestions
