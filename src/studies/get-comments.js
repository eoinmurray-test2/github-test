const { Parse, Comment, Study } = require('../parse-rest')

const getComments = async ({ studyId, parentId }) => {
  const query = new Parse.Query(Comment)


  const parseStudy = new Study()
  parseStudy.id = studyId
  query.equalTo('study', parseStudy)
  // const innerQuery = new Parse.Query(Study)
  // innerQuery.equalTo(studyId)
  // query.matchesQuery('study', innerQuery)
  query.descending('createdAt')
  query.include('user')

  if (parentId) {
    const parentComment = new Comment()
    parentComment.id = parentId
    query.equalTo('parent', parentComment)
  } else {
    query.equalTo('parent', null)
  }

  const result = await query.find()
  const comments = await Promise.all(result.map(comment =>
    new Promise(async (resolve) => {
      resolve({
        ...comment.toJSON(),
        user: comment.get('user') && comment.get('user').toJSON(),
        children: await getComments({ studyId, parentId: comment.id })
      })
    })
  ))

  return comments
}

getComments.handler = async (req, res, next) => {
  try {
    const { studyId, parentId } = req.body
    res.send(await getComments({ studyId, parentId }))
  } catch (err) {
    next(err)
  }
}

module.exports = getComments
